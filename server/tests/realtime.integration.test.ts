import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { io as connect, type Socket } from "socket.io-client";
import pg from "pg";

const databaseUrl = process.env["TEST_DATABASE_URL"];

test("M5 realtime kitchen and customer updates", { skip: !databaseUrl }, async (t) => {
  const url = new URL(databaseUrl!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/foodflow_m4_test", "Integration tests require a local database named foodflow_m4_test");
  process.env["DATABASE_URL"] = databaseUrl;
  process.env["DIRECT_URL"] = databaseUrl;
  process.env["JWT_ACCESS_SECRET"] = "foodflow-test-secret-for-realtime-only-12345";
  process.env["FRONTEND_URL"] = "http://localhost:3000";
  process.env["NODE_ENV"] = "test";

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const { prisma } = await import("../src/lib/prisma.js");
  const { createBackendServer } = await import("../src/http-server.js");
  const { createAccessToken } = await import("../src/modules/auth/access-token.js");
  const { server, realtime } = createBackendServer();
  const sockets: Socket[] = [];
  t.after(async () => {
    for (const socket of sockets) socket.disconnect();
    await realtime.close();
    await prisma.$disconnect();
    await pool.end();
  });

  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  for (const folder of (await readdir("prisma/migrations")).sort()) {
    if (folder !== "migration_lock.toml") await pool.query(await readFile(`prisma/migrations/${folder}/migration.sql`, "utf8"));
  }
  for (const id of ["customer", "owner", "outsider"]) {
    await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, passwordHash: "unused" } });
  }
  await prisma.restaurant.create({ data: { id: "branch", name: "FoodFlow", slug: "branch" } });
  await prisma.category.create({ data: { id: "burgers", restaurantId: "branch", name: "Burgers", slug: "burgers" } });
  await prisma.menuItem.create({ data: { id: "burger", restaurantId: "branch", categoryId: "burgers", name: "Burger", slug: "burger", prepTimeMinutes: 5, variants: { create: { size: "REGULAR", price: "10.00" } } } });
  await prisma.restaurantMember.create({ data: { userId: "owner", restaurantId: "branch", role: "OWNER" } });

  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const cookie = (id: string) => `foodflow_access=${createAccessToken({ id, role: "CUSTOMER" })}`;
  const openSocket = async (id?: string): Promise<Socket> => {
    const socket = connect(base, { path: "/api/socket.io", transports: ["websocket"], reconnection: false, extraHeaders: { Origin: "http://localhost:3000", ...(id ? { Cookie: cookie(id) } : {}) } });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    return socket;
  };
  const event = (socket: Socket, name: string) => new Promise<{ publicId: string; status: string; revision: number }>((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(name, receive); reject(new Error(`${name} not received`)); }, 5000);
    const receive = (payload: { publicId: string; status: string; revision: number }) => { clearTimeout(timeout); resolve(payload); };
    socket.once(name, receive);
  });
  const request = async (path: string, method: string, body: unknown, id: string) => {
    const response = await fetch(`${base}${path}`, { method, headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", Cookie: cookie(id) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() as { data?: { order?: { publicId: string; revision: number } } } };
  };

  await t.test("unauthenticated sockets are rejected", async () => {
    await assert.rejects(() => openSocket(), /Authentication required/);
  });
  const customer = await openSocket("customer");
  const owner = await openSocket("owner");
  const outsider = await openSocket("outsider");

  await t.test("only branch staff can subscribe", async () => {
    const forbidden = await outsider.emitWithAck("kitchen.subscribe", { restaurantId: "branch" });
    assert.deepEqual(forbidden, { success: false, error: { code: "FORBIDDEN", message: "Kitchen access denied" } });
    const allowed = await owner.emitWithAck("kitchen.subscribe", { restaurantId: "branch" });
    assert.deepEqual(allowed, { success: true, restaurantId: "branch" });
  });

  let publicId = "";
  await t.test("new orders notify the customer and kitchen, not an outsider", async () => {
    const customerSignal = event(customer, "order.created");
    const kitchenSignal = event(owner, "order.created");
    let outsiderNotified = false;
    outsider.once("order.created", () => { outsiderNotified = true; });
    const result = await request("/api/orders", "POST", { restaurantId: "branch", checkoutKey: randomUUID(), orderType: "TAKEAWAY", items: [{ menuItemId: "burger", size: "REGULAR", quantity: 1 }] }, "customer");
    assert.equal(result.status, 201);
    publicId = result.body.data?.order?.publicId ?? "";
    assert.ok(publicId);
    assert.deepEqual((await customerSignal).publicId, publicId);
    assert.deepEqual((await kitchenSignal).publicId, publicId);
    assert.equal(outsiderNotified, false);
  });

  await t.test("kitchen status advances and reaches the customer", async () => {
    const signal = event(customer, "order.confirmed");
    const result = await request(`/api/restaurants/branch/kitchen/orders/${publicId}/status`, "PATCH", { status: "CONFIRMED", revision: 0 }, "owner");
    assert.equal(result.status, 200);
    assert.equal(result.body.data?.order?.revision, 1);
    const update = await signal;
    assert.equal(update.publicId, publicId);
    assert.equal(update.status, "CONFIRMED");
    assert.equal(update.revision, 1);
  });
});
