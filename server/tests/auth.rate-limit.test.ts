import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import express from "express";
import { createAuthRateLimiters } from "../src/modules/auth/auth.rate-limit.js";

function listen(app: express.Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = createServer(app);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Server did not bind to a port");
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done, reject) => server.close((error) => error ? reject(error) : done())),
      });
    });
  });
}

test("auth limits block excess attempts with the API error envelope", async (t) => {
  const app = express();
  const limits = createAuthRateLimiters({
    login: { windowMs: 60_000, limit: 2 },
    register: { windowMs: 60_000, limit: 1 },
  });
  app.post("/login", limits.login, (_req, res) => res.status(401).json({ success: false }));
  app.post("/register", limits.register, (_req, res) => res.status(202).json({ success: true }));
  const server = await listen(app);
  t.after(server.close);

  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await fetch(`${server.baseUrl}/login`, { method: "POST" })).status, 401);
  }
  const limitedLogin = await fetch(`${server.baseUrl}/login`, { method: "POST" });
  assert.equal(limitedLogin.status, 429);
  assert.equal((await limitedLogin.json()).error.code, "RATE_LIMITED");
  assert.ok(limitedLogin.headers.get("ratelimit"));

  assert.equal((await fetch(`${server.baseUrl}/register`, { method: "POST" })).status, 202);
  assert.equal((await fetch(`${server.baseUrl}/register`, { method: "POST" })).status, 429);
});

test("successful logins do not consume the login failure allowance", async (t) => {
  const app = express();
  const { login } = createAuthRateLimiters({ login: { windowMs: 60_000, limit: 1, skipSuccessfulRequests: true } });
  app.post("/login", login, (_req, res) => res.status(200).json({ success: true }));
  const server = await listen(app);
  t.after(server.close);

  assert.equal((await fetch(`${server.baseUrl}/login`, { method: "POST" })).status, 200);
  assert.equal((await fetch(`${server.baseUrl}/login`, { method: "POST" })).status, 200);
});
