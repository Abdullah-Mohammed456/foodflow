import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function originCheck(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }
  if (!req.path.startsWith("/api/")) {
    next();
    return;
  }
  const origin = req.get("origin");
  const referer = req.get("referer");
  if (!origin && !referer) {
    next();
    return;
  }
  const frontend = getEnv().FRONTEND_URL;
  if (origin === frontend) {
    next();
    return;
  }
  if (!origin && referer && referer.startsWith(`${frontend}/`)) {
    next();
    return;
  }
  next(new AppError("FORBIDDEN", "Cross-origin request denied"));
}
