import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

const frontend = "http://localhost:3000";

test("M7 security headers, request id, and origin check", { concurrency: 1 }, async (t) => {
  process.env["DATABASE_URL"] ??= "postgresql://foodflow:foodflow@127.0.0.1:5432/foodflow?schema=public";
  process.env["DIRECT_URL"] ??= process.env["DATABASE_URL"];
  process.env["JWT_ACCESS_SECRET"] ??= "foodflow-test-secret-for-security-only-12345";
  process.env["FRONTEND_URL"] ??= frontend;
  process.env["NODE_ENV"] = "test";

  const { createApp } = await import("../src/app.js");
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  await t.test("helmet headers are present and powered-by is removed", async () => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("x-request-id"));
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-powered-by"), null);
  });

  await t.test("cross-origin mutations are denied before reaching controllers", async () => {
    const response = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ email: "x@example.test", name: "X", password: "Long-Password-123" }),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "FORBIDDEN");
  });

  await t.test("same-origin mutations pass the origin gate", async () => {
    const response = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: frontend },
      body: JSON.stringify({}),
    });
    assert.notEqual(response.status, 403);
  });
});
