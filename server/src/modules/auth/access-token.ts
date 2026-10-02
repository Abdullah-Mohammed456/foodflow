import { createHmac } from "node:crypto";
import { getEnv } from "../../config/env.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createAccessToken(user: {
  id: string;
  role: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: user.id,
    role: user.role,
    iss: "foodflow-api",
    aud: "foodflow-client",
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", getEnv().JWT_ACCESS_SECRET)
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}
