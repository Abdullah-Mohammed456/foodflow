import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { getEnv } from "../config/env.js";

function handler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
  });
}

export function createApiRateLimiters() {
  const env = getEnv();
  const skip = () => env.NODE_ENV === "test";
  return {
    general: rateLimit({
      windowMs: env.API_GENERAL_WINDOW_MS,
      limit: env.API_GENERAL_LIMIT,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip,
      handler,
    }),
    checkout: rateLimit({
      windowMs: env.API_CHECKOUT_WINDOW_MS,
      limit: env.API_CHECKOUT_LIMIT,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip,
      handler,
    }),
    admin: rateLimit({
      windowMs: env.API_ADMIN_WINDOW_MS,
      limit: env.API_ADMIN_LIMIT,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip,
      handler,
    }),
  };
}
