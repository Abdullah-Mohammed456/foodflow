import { createHmac, timingSafeEqual } from "node:crypto";
import { UserRole } from "@prisma/client";
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

export interface AccessTokenClaims {
  id: string;
  role: UserRole;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function verifyAccessToken(token: string): AccessTokenClaims | null {
  if (token.length > 4096) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", getEnv().JWT_ACCESS_SECRET)
    .update(unsignedToken)
    .digest();
  const actualSignature = Buffer.from(encodedSignature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const header: unknown = JSON.parse(
      Buffer.from(encodedHeader, "base64url").toString("utf8"),
    );
    const payload: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    if (
      !isRecord(header) ||
      header["alg"] !== "HS256" ||
      header["typ"] !== "JWT" ||
      !isRecord(payload)
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const { sub, role, iss, aud, iat, exp } = payload;
    if (
      typeof sub !== "string" ||
      sub.length === 0 ||
      (role !== UserRole.CUSTOMER && role !== UserRole.ADMIN) ||
      iss !== "foodflow-api" ||
      aud !== "foodflow-client" ||
      typeof iat !== "number" ||
      typeof exp !== "number" ||
      iat > now + 60 ||
      exp <= now ||
      exp <= iat ||
      exp - iat > ACCESS_TOKEN_TTL_SECONDS
    ) {
      return null;
    }

    return { id: sub, role };
  } catch {
    return null;
  }
}
