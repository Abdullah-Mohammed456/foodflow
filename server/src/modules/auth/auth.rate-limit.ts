import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { getEnv } from "../../config/env.js";

type LimitOptions = {
  windowMs: number;
  limit: number;
  skipSuccessfulRequests?: boolean;
};

function handler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    },
  });
}

function createLimiter(options: LimitOptions) {
  return rateLimit({
    ...options,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler,
  });
}

export function createAuthRateLimiters(options?: {
  login?: LimitOptions;
  register?: LimitOptions;
}) {
  const env = getEnv();
  return {
    login: createLimiter(options?.login ?? {
      windowMs: env.AUTH_LOGIN_WINDOW_MS,
      limit: env.AUTH_LOGIN_LIMIT,
      skipSuccessfulRequests: true,
    }),
    register: createLimiter(options?.register ?? {
      windowMs: env.AUTH_REGISTER_WINDOW_MS,
      limit: env.AUTH_REGISTER_LIMIT,
    }),
  };
}
