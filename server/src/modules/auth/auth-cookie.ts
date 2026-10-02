import type { Response } from "express";
import { getEnv } from "../../config/env.js";
import { ACCESS_TOKEN_TTL_SECONDS } from "./access-token.js";

export const ACCESS_COOKIE = "foodflow_access";

function cookieAttributes(): string[] {
  return [
    "Path=/api",
    "HttpOnly",
    "SameSite=Lax",
    ...(getEnv().NODE_ENV === "production" ? ["Secure"] : []),
  ];
}

export function setAccessCookie(res: Response, token: string): void {
  res.append(
    "Set-Cookie",
    [
      `${ACCESS_COOKIE}=${token}`,
      ...cookieAttributes(),
      `Max-Age=${ACCESS_TOKEN_TTL_SECONDS}`,
    ].join("; "),
  );
}

export function clearAccessCookie(res: Response): void {
  res.append(
    "Set-Cookie",
    [
      `${ACCESS_COOKIE}=`,
      ...cookieAttributes(),
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ].join("; "),
  );
}
