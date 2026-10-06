import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import pg from "pg";

const databaseUrl = process.env["TEST_DATABASE_URL"];

test("M4 orders API with isolated PostgreSQL", { skip: !databaseUrl }, async (t) => {
  const url = new URL(databaseUrl!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/foodflow_m4_test",
    "Integration tests require a local database named foodflow_m4_test");
  process.env["DATABASE_URL"] = databaseUrl;
  process.env["DIRECT_URL"] = databaseUrl;
  process.env["JWT_ACCESS_SECRET"] = "foodflow-test-secret-for-orders-only-12345";
  process.env["FRONTEND_URL"] = "http://localhost:3000";
  process.env["NODE_ENV"] = "test";
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const { prisma } = await import("../src/lib/prisma.js");
  let server: import("node:http").Server | undefined;
  t.after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
    await pool.end();
  });
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  for (const folder of (await readdir("prisma/migrations")).sort()) {
    if (folder === "migration_lock.toml") continue;
    await pool.query(await readFile(`prisma/migrations/${folder}/migration.sql`, "utf8"));
  }
  const { createApp } = await import("../src/app.js");
  const { createAccessToken } = await import("../src/modules/auth/access-token.js");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/orders`;
  for (const id of ["customer", "other", "admin"]) {
    await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, passwordHash: "unused", role: id === "admin" ? "ADMIN" : "CUSTOMER" } });
  }
  for (const id of ["branch", "other-branch"]) {
    await prisma.restaurant.create({ data: { id, name: id, slug: id } });
    await prisma.category.create({ data: { id: `${id}-category`, restaurantId: id, name: "Burgers", slug: "burgers" } });
  }
  for (const [id, restaurantId, size, price, isCombo] of [
    ["burger", "branch", "SINGLE", "10.10", false],
    ["combo", "branch", "REGULAR", "20.25", true],
    ["foreign", "other-branch", "SINGLE", "5.00", false],
  ] as const) {
    await prisma.menuItem.create({ data: {
      id, restaurantId, categoryId: `${restaurantId}-category`, name: id, slug: id,
      prepTimeMinutes: 5, isCombo, variants: { create: { size, price } },
    } });
  }
  function cart(overrides: Record<string, unknown> = {}) {
    return {
      restaurantId: "branch", checkoutKey: randomUUID(), orderType: "TAKEAWAY",
      items: [{ menuItemId: "burger", size: "SINGLE", quantity: 3 }, { menuItemId: "combo", size: "REGULAR", quantity: 1 }],
      ...overrides,
    };
  }
  async function request(path = "", method = "GET", body?: unknown, user = "customer") {
    const response = await fetch(`${base}${path}`, {
      method, headers: {
        "Content-Type": "application/json",
        ...(user ? { cookie: `foodflow_access=${createAccessToken({ id: user, role: user === "admin" ? "ADMIN" : "CUSTOMER" })}` } : {}),
      }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }
  let publicId = "";
  await t.test("unauthenticated access and admin checkout are denied", async () => {
    assert.equal((await request("", "GET", undefined, "")).status, 401);
    assert.equal((await request("", "POST", cart(), "admin")).status, 403);
  });
  await t.test("restaurant staff cannot create customer orders even with a CUSTOMER token", async () => {
    const count = await prisma.order.count();
    for (const role of ["OWNER", "MANAGER", "KITCHEN"] as const) {
      await prisma.restaurantMember.upsert({ where: { userId_restaurantId: { userId: "other", restaurantId: "branch" } }, create: { userId: "other", restaurantId: "branch", role }, update: { role } });
      const denied = await request("", "POST", cart(), "other");
      assert.equal(denied.status, 403);
      assert.equal(denied.body.error.code, "FORBIDDEN");
    }
    assert.equal(await prisma.order.count(), count);
    await prisma.restaurantMember.deleteMany({ where: { userId: "other" } });
  });
  await t.test("server prices decimals and combos and persists snapshots", async () => {
    const result = await request("", "POST", cart());
    assert.equal(result.status, 201);
    const order = result.body.data.order;
    publicId = order.publicId;
    assert.equal(order.status, "PENDING");
    assert.equal(order.total, "50.55");
    assert.equal(order.deliveryFee, "0");
    assert.equal(order.discount, "0");
    assert.equal(order.items.find((item: { isComboSnapshot: boolean }) => item.isComboSnapshot).unitPrice, "20.25");
    assert.equal("requestHash" in order, false);
    assert.equal("checkoutKey" in order, false);
    assert.equal(await prisma.orderItem.count(), 2);
  });
  await t.test("price tampering is rejected without creating an order", async () => {
    const count = await prisma.order.count();
    assert.equal((await request("", "POST", cart({ total: "0.01" }))).status, 400);
    assert.equal(await prisma.order.count(), count);
  });
  await t.test("unknown items, foreign branches and invalid sizes are rejected", async () => {
    for (const [menuItemId, size] of [["missing", "SINGLE"], ["foreign", "SINGLE"], ["burger", "DOUBLE"]]) {
      assert.equal((await request("", "POST", cart({ items: [{ menuItemId, size, quantity: 1 }] }))).status, 400);
    }
  });
  await t.test("closed restaurants and inactive categories are rejected", async () => {
    await prisma.restaurant.update({ where: { id: "branch" }, data: { isOpen: false } });
    assert.equal((await request("", "POST", cart())).status, 409);
    await prisma.restaurant.update({ where: { id: "branch" }, data: { isOpen: true } });
    await prisma.category.update({ where: { id: "branch-category" }, data: { isActive: false } });
    assert.equal((await request("", "POST", cart())).status, 409);
    await prisma.category.update({ where: { id: "branch-category" }, data: { isActive: true } });
  });
  await t.test("unavailable items and unavailable sizes are rejected", async () => {
    await prisma.menuItem.update({ where: { id: "burger" }, data: { isAvailable: false } });
    assert.equal((await request("", "POST", cart())).status, 409);
    await prisma.menuItem.update({ where: { id: "burger" }, data: { isAvailable: true } });
    await prisma.menuItemVariant.updateMany({ where: { menuItemId: "burger" }, data: { isAvailable: false } });
    assert.equal((await request("", "POST", cart())).status, 409);
    await prisma.menuItemVariant.updateMany({ where: { menuItemId: "burger" }, data: { isAvailable: true } });
  });
  await t.test("invalid catalog prices and overflowing totals are rejected safely", async () => {
    for (const price of ["0", "-1.00"]) {
      await prisma.menuItemVariant.updateMany({ where: { menuItemId: "burger" }, data: { price } });
      assert.equal((await request("", "POST", cart())).status, 409);
    }
    await prisma.menuItemVariant.updateMany({ where: { menuItemId: "burger" }, data: { price: "99999999.99" } });
    assert.equal((await request("", "POST", cart())).status, 400);
    await prisma.menuItemVariant.updateMany({ where: { menuItemId: "burger" }, data: { price: "10.10" } });
  });
  await t.test("delivery requires and stores an address; dine-in is supported", async () => {
    assert.equal((await request("", "POST", cart({ orderType: "DELIVERY" }))).status, 400);
    const delivery = await request("", "POST", cart({ orderType: "DELIVERY", deliveryAddress: "12 Cairo Street" }));
    assert.equal(delivery.status, 201);
    assert.equal(delivery.body.data.order.deliveryAddress, "12 Cairo Street");
    assert.equal((await request("", "POST", cart({ orderType: "DINE_IN" }))).status, 201);
  });
  await t.test("retrying a checkout returns the original order and mismatched reuse conflicts", async () => {
    const input = cart();
    const first = await request("", "POST", input);
    const count = await prisma.order.count();
    const retry = await request("", "POST", { ...input, items: [...input.items].reverse() });
    assert.equal(retry.status, 200);
    assert.equal(retry.body.data.replayed, true);
    assert.equal(retry.body.data.order.publicId, first.body.data.order.publicId);
    assert.equal(await prisma.order.count(), count);
    assert.equal((await request("", "POST", { ...input, notes: "changed" })).status, 409);
  });
  await t.test("simultaneous identical checkouts create exactly one order", async () => {
    const input = cart();
    const responses = await Promise.all([request("", "POST", input), request("", "POST", input)]);
    assert.deepEqual(responses.map((result) => result.status).sort(), [200, 201]);
    assert.equal(responses[0]!.body.data.order.publicId, responses[1]!.body.data.order.publicId);
    assert.equal(await prisma.order.count({ where: { checkoutKey: input.checkoutKey } }), 1);
  });
  await t.test("each customer has an independent checkout key namespace", async () => {
    const input = cart();
    const first = await request("", "POST", input);
    const other = await request("", "POST", input, "other");
    assert.equal(other.status, 201);
    assert.notEqual(first.body.data.order.publicId, other.body.data.order.publicId);
  });
  await t.test("history is paginated and restricted to the authenticated customer", async () => {
    const result = await request("?limit=1&page=1");
    assert.equal(result.status, 200);
    assert.equal(result.body.data.items.length, 1);
    assert.ok(result.body.data.pagination.total > 1);
    const other = await request("", "GET", undefined, "other");
    assert.equal(other.body.data.pagination.total, 1);
    assert.equal((await request("?limit=101")).status, 400);
    assert.equal((await request("?customerId=other")).status, 400);
  });
  await t.test("detail and cancellation hide another customer's order", async () => {
    assert.equal((await request(`/${publicId}`, "GET", undefined, "other")).status, 404);
    assert.equal((await request(`/${publicId}/cancel`, "POST", {}, "other")).status, 404);
    assert.equal((await request("/missing")).status, 404);
  });
  await t.test("old names, sizes and prices survive catalog edits and deletion is restricted", async () => {
    await prisma.menuItem.update({ where: { id: "burger" }, data: { name: "New burger" } });
    await prisma.menuItemVariant.updateMany({ where: { menuItemId: "burger" }, data: { price: "99.99" } });
    const order = (await request(`/${publicId}`)).body.data.order;
    assert.equal(order.total, "50.55");
    assert.equal(order.items.find((item: { menuItemId: string }) => item.menuItemId === "burger").nameSnapshot, "burger");
    await assert.rejects(prisma.menuItem.delete({ where: { id: "burger" } }));
  });
  await t.test("cancellation is repeatable while other status transitions are rejected", async () => {
    assert.equal((await request(`/${publicId}/cancel`, "POST", { status: "READY" })).status, 400);
    assert.equal((await request(`/${publicId}/cancel`, "POST", {})).body.data.order.status, "CANCELLED");
    assert.equal((await request(`/${publicId}/cancel`, "POST", {})).status, 200);
    for (const status of ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] as const) {
      await prisma.order.update({ where: { publicId }, data: { status } });
      assert.equal((await request(`/${publicId}/cancel`, "POST", {})).status, 409);
    }
  });
  await t.test("cancellation cannot overwrite a concurrent confirmation", async () => {
    const created = await request("", "POST", cart());
    const id = created.body.data.order.publicId;
    const [confirmation, cancellation] = await Promise.all([
      prisma.order.updateMany({ where: { publicId: id, status: "PENDING" }, data: { status: "CONFIRMED" } }),
      request(`/${id}/cancel`, "POST", {}),
    ]);
    const order = await prisma.order.findUniqueOrThrow({ where: { publicId: id } });
    if (confirmation.count === 1) {
      assert.equal(order.status, "CONFIRMED");
      assert.equal(cancellation.status, 409);
    } else {
      assert.equal(order.status, "CANCELLED");
      assert.equal(cancellation.status, 200);
    }
  });
  await t.test("history can filter by status", async () => {
    const result = await request("?status=COMPLETED");
    assert.equal(result.body.data.pagination.total, 1);
    assert.equal(result.body.data.items[0].publicId, publicId);
  });
  await t.test("invalid line write rolls back the complete order transaction", async () => {
    const orders = await prisma.order.count();
    const items = await prisma.orderItem.count();
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.order.create({ data: {
        customerId: "customer", restaurantId: "branch", checkoutKey: randomUUID(), requestHash: "test",
        orderType: "TAKEAWAY", subtotal: "10.10", total: "10.10", prepDueAt: new Date(),
        items: { create: { menuItemId: "burger", nameSnapshot: "burger", unitPrice: "10.10", quantity: 0, lineTotal: "0" } },
      } });
    }));
    assert.equal(await prisma.order.count(), orders);
    assert.equal(await prisma.orderItem.count(), items);
  });
  await t.test("checkout service rolls back when saving a valid cart fails", async () => {
    const { OrderService } = await import("../src/modules/orders/order.service.js");
    const { PrismaOrderRepository } = await import("../src/modules/orders/order.repository.js");
    const { createOrderSchema } = await import("../src/modules/orders/order.schema.js");
    const service = new OrderService(new PrismaOrderRepository(prisma));
    const orders = await prisma.order.count();
    const items = await prisma.orderItem.count();
    await pool.query(`
      CREATE FUNCTION reject_test_order_item() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Simulated item persistence failure'; END $$;
      CREATE TRIGGER reject_test_order_item BEFORE INSERT ON order_items
      FOR EACH ROW EXECUTE FUNCTION reject_test_order_item();
    `);
    try {
      await assert.rejects(service.create("customer", createOrderSchema.parse(cart())));
      assert.equal(await prisma.order.count(), orders);
      assert.equal(await prisma.orderItem.count(), items);
    } finally {
      await pool.query('DROP TRIGGER reject_test_order_item ON order_items; DROP FUNCTION reject_test_order_item()');
    }
  });
  await t.test("database rejects inconsistent order totals", async () => {
    await assert.rejects(prisma.order.update({ where: { publicId }, data: { total: "0.01" } }));
  });
});
