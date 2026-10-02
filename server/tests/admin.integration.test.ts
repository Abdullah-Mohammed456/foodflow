import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import pg from "pg";

const databaseUrl = process.env["TEST_DATABASE_URL"];

test("M6 admin analytics and staff with isolated PostgreSQL", { skip: !databaseUrl }, async (t) => {
  const url = new URL(databaseUrl!);
  assert.ok(
    ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/foodflow_m4_test",
    "Integration tests require a local database named foodflow_m4_test",
  );
  process.env["DATABASE_URL"] = databaseUrl;
  process.env["DIRECT_URL"] = databaseUrl;
  process.env["JWT_ACCESS_SECRET"] = "foodflow-test-secret-for-admin-only-12345";
  process.env["FRONTEND_URL"] = "http://localhost:3000";
  process.env["NODE_ENV"] = "test";

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const { prisma } = await import("../src/lib/prisma.js");
  let server: import("node:http").Server | undefined;
  t.after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => (error ? reject(error) : resolve())));
    await prisma.$disconnect();
    await pool.end();
  });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  for (const folder of (await readdir("prisma/migrations")).sort()) {
    if (folder === "migration_lock.toml") continue;
    await pool.query(await readFile(`prisma/migrations/${folder}/migration.sql`, "utf8"));
  }
  const { createApp } = await import("../src/app.js");
  const { createAccessToken } = await import("../src/modules/auth/access-token.js");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/restaurants/branch/admin`;

  for (const id of ["owner", "manager", "kitchen", "customer", "outsider", "newcook"]) {
    await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, passwordHash: "unused" } });
  }
  await prisma.restaurant.create({ data: { id: "branch", name: "branch", slug: "branch" } });
  await prisma.restaurant.create({ data: { id: "other-branch", name: "other", slug: "other-branch" } });
  await prisma.category.create({ data: { id: "branch-category", restaurantId: "branch", name: "Burgers", slug: "burgers" } });
  await prisma.restaurantMember.createMany({
    data: [
      { userId: "owner", restaurantId: "branch", role: "OWNER" },
      { userId: "manager", restaurantId: "branch", role: "MANAGER" },
      { userId: "kitchen", restaurantId: "branch", role: "KITCHEN" },
      { userId: "outsider", restaurantId: "other-branch", role: "OWNER" },
    ],
  });
  for (const [id, isCombo] of [["burger", false], ["combo", true]] as const) {
    await prisma.menuItem.create({
      data: {
        id, restaurantId: "branch", categoryId: "branch-category", name: id, slug: id,
        prepTimeMinutes: 5, isCombo, variants: { create: { size: "REGULAR", price: "10.00" } },
      },
    });
  }
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600 * 1000);
  async function makeOrder(id: string, status: "COMPLETED" | "PENDING" | "CANCELLED", total: string, createdAt: Date) {
    const order = await prisma.order.create({
      data: {
        id, publicId: id, customerId: "customer", restaurantId: "branch", orderType: "TAKEAWAY",
        status, revision: status === "PENDING" ? 0 : 4, prepDueAt: new Date(createdAt.getTime() + 15 * 60000),
        subtotal: total, deliveryFee: "0", discount: "0", total,
        checkoutKey: `key-${id}`, requestHash: `hash-${id}`, createdAt,
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id, menuItemId: "burger", nameSnapshot: "burger",
        unitPrice: "10.00", quantity: 2, lineTotal: "20.00",
      },
    });
    if (status === "COMPLETED") {
      await prisma.order.update({ where: { id: order.id }, data: { updatedAt: new Date(createdAt.getTime() + 10 * 60000) } });
    }
  }
  await makeOrder("order-1", "COMPLETED", "20.00", hourAgo);
  await makeOrder("order-2", "COMPLETED", "30.00", now);
  await makeOrder("order-3", "PENDING", "15.00", now);
  await makeOrder("order-4", "CANCELLED", "99.00", now);

  function token(user: string) {
    return createAccessToken({ id: user, role: "CUSTOMER" });
  }
  async function request(path: string, method = "GET", body?: unknown, user?: string) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(user ? { cookie: `foodflow_access=${token(user)}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: (await response.json()) as { success: boolean; data: any; error?: { code: string } } };
  }

  await t.test("analytics rejects unauthenticated, customers, kitchen, and outsiders", async () => {
    assert.equal((await request("/overview")).status, 401);
    assert.equal((await request("/overview", "GET", undefined, "customer")).status, 403);
    assert.equal((await request("/overview", "GET", undefined, "kitchen")).status, 403);
    assert.equal((await request("/overview", "GET", undefined, "outsider")).status, 403);
  });

  await t.test("overview excludes cancelled revenue but counts all orders", async () => {
    const result = await request("/overview", "GET", undefined, "owner");
    assert.equal(result.status, 200);
    assert.equal(result.body.data.totalOrders, 4);
    assert.equal(result.body.data.totalRevenue, "65.00");
    assert.equal(result.body.data.activeQueue, 1);
    assert.equal(result.body.data.completedOrders, 2);
  });

  await t.test("revenue buckets and popular items skip cancelled orders", async () => {
    const revenue = await request("/revenue?granularity=day", "GET", undefined, "manager");
    assert.equal(revenue.status, 200);
    const total = revenue.body.data.buckets.reduce((sum: number, bucket: { revenue: string }) => sum + Number(bucket.revenue), 0);
    assert.equal(total.toFixed(2), "65.00");
    const popular = await request("/popular-items?limit=5", "GET", undefined, "owner");
    assert.equal(popular.status, 200);
    assert.equal(popular.body.data.items[0].menuItemId, "burger");
    assert.equal(popular.body.data.items[0].quantity, 6);
  });

  await t.test("rush returns 24 hourly buckets", async () => {
    const rush = await request("/rush?days=7", "GET", undefined, "owner");
    assert.equal(rush.status, 200);
    assert.equal(rush.body.data.perHourUtc.length, 24);
  });

  await t.test("invalid ranges are rejected", async () => {
    assert.equal((await request("/overview?from=not-a-date", "GET", undefined, "owner")).status, 400);
    assert.equal((await request("/rush?days=99", "GET", undefined, "owner")).status, 400);
  });

  await t.test("only owners mutate staff and the last owner is protected", async () => {
    assert.equal((await request("/staff", "GET", undefined, "manager")).status, 200);
    assert.equal((await request("/staff", "POST", { email: "newcook@example.test", role: "KITCHEN" }, "manager")).status, 403);
    const added = await request("/staff", "POST", { email: "newcook@example.test", role: "KITCHEN" }, "owner");
    assert.equal(added.status, 201);
    const memberId = added.body.data.member.id as string;
    assert.equal((await request("/staff", "POST", { email: "newcook@example.test", role: "KITCHEN" }, "owner")).status, 409);
    const members = await request("/staff", "GET", undefined, "owner");
    const ownerMember = members.body.data.members.find((member: { user: { email: string } }) => member.user.email === "owner@example.test");
    assert.equal((await request(`/staff/${ownerMember.id}`, "PATCH", { role: "MANAGER" }, "owner")).status, 409);
    assert.equal((await request(`/staff/${ownerMember.id}`, "DELETE", undefined, "owner")).status, 409);
    assert.equal((await request(`/staff/${memberId}`, "PATCH", { role: "KITCHEN" }, "owner")).status, 200);
    assert.equal((await request(`/staff/${memberId}`, "DELETE", undefined, "owner")).status, 200);
  });
});
