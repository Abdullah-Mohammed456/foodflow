import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { ACCESS_COOKIE } from "../modules/auth/auth-cookie.js";
import { verifyAccessToken } from "../modules/auth/access-token.js";

function readAccessCookie(req: Request): string | null {
  const cookieHeader = req.get("cookie");
  if (!cookieHeader) return null;

  let token: string | null = null;
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== ACCESS_COOKIE) {
      continue;
    }
    if (token !== null) return null;
    try {
      token = decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return token;
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = readAccessCookie(req);
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) {
    next(new AppError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  req.auth = claims;
  next();
}
