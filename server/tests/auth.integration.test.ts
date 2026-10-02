import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import pg from "pg";

const databaseUrl = process.env["TEST_DATABASE_URL"];

test("M2 authentication API", { skip: !databaseUrl }, async (t) => {
  const url = new URL(databaseUrl!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/foodflow_m4_test");
  Object.assign(process.env, {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    JWT_ACCESS_SECRET: "foodflow-test-secret-for-authentication-12345",
    FRONTEND_URL: "http://localhost:3000",
    NODE_ENV: "test",
  });
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const { prisma } = await import("../src/lib/prisma.js");
  const { createAccessToken } = await import("../src/modules/auth/access-token.js");
  const { createApp } = await import("../src/app.js");
  let server: import("node:http").Server | undefined;
  t.after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
    await pool.end();
  });

  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  for (const folder of (await readdir("prisma/migrations")).sort()) {
    if (folder !== "migration_lock.toml") await pool.query(await readFile(`prisma/migrations/${folder}/migration.sql`, "utf8"));
  }
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth`;

  async function request(path: string, body?: unknown, cookie?: string) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: path === "/me" ? "GET" : path === "/logout" ? "POST" : "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { response, body: await response.json() };
  }

  const credentials = { email: "customer@example.test", name: "Customer", password: "correct-password" };
  await t.test("registration hides duplicate emails", async () => {
    const first = await request("/register", credentials);
    const second = await request("/register", credentials);
    assert.equal(first.response.status, 202);
    assert.equal(second.response.status, 202);
    assert.deepEqual(first.body, second.body);
    assert.equal(await prisma.user.count({ where: { email: credentials.email } }), 1);
  });
  let accessCookie = "";
  await t.test("login validates credentials and creates an HttpOnly cookie", async () => {
    assert.equal((await request("/login", { email: credentials.email, password: "wrong-password" })).response.status, 401);
    const result = await request("/login", { email: credentials.email, password: credentials.password });
    assert.equal(result.response.status, 200);
    accessCookie = result.response.headers.getSetCookie()[0]!.split(";")[0]!;
    assert.match(result.response.headers.getSetCookie()[0]!, /HttpOnly/);
    assert.equal(result.body.data.user.email, credentials.email);
    assert.equal("passwordHash" in result.body.data.user, false);
  });
  await t.test("protected profile routes validate the token and update the current user", async () => {
    assert.equal((await request("/me")).response.status, 401);
    assert.equal((await request("/me", undefined, "foodflow_access=invalid")).response.status, 401);
    const [header, payload] = accessCookie.slice("foodflow_access=".length).split(".");
    const expiredPayload = Buffer.from(JSON.stringify({
      ...JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")),
      iat: 1,
      exp: 2,
    })).toString("base64url");
    const expiredUnsigned = `${header}.${expiredPayload}`;
    const expiredSignature = createHmac("sha256", process.env["JWT_ACCESS_SECRET"]!)
      .update(expiredUnsigned)
      .digest("base64url");
    assert.equal((await request("/me", undefined, `foodflow_access=${expiredUnsigned}.${expiredSignature}`)).response.status, 401);
    const profile = await request("/me", undefined, accessCookie);
    assert.equal(profile.response.status, 200);
    const update = await fetch(`${baseUrl}/me`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: accessCookie },
      body: JSON.stringify({ name: "Updated Customer" }),
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).data.user.name, "Updated Customer");
  });
  await t.test("logout clears the authentication cookie", async () => {
    const result = await request("/logout", {}, accessCookie);
    assert.equal(result.response.status, 200);
    assert.match(result.response.headers.getSetCookie()[0]!, /Max-Age=0/);
  });
  await t.test("global roles protect customer-only routes", async () => {
    const admin = await prisma.user.create({ data: { email: "admin@example.test", name: "Admin", passwordHash: "unused", role: "ADMIN" } });
    const cookie = `foodflow_access=${createAccessToken({ id: admin.id, role: admin.role })}`;
    const response = await fetch(`${baseUrl.replace("/auth", "/orders")}`, { headers: { cookie } });
    assert.equal(response.status, 403);
  });
  await t.test("login limiter blocks repeated failures", async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      assert.equal((await request("/login", { email: credentials.email, password: "wrong-password" })).response.status, 401);
    }
    const blocked = await request("/login", { email: credentials.email, password: "wrong-password" });
    assert.equal(blocked.response.status, 429);
    assert.equal(blocked.body.error.code, "RATE_LIMITED");
  });
});
