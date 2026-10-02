import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import { ACCESS_TOKEN_TTL_SECONDS, createAccessToken } from "./access-token.js";
import type { AuthService } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

const ACCESS_COOKIE = "foodflow_access";

function setAccessCookie(res: Response, token: string): void {
  const env = process.env["NODE_ENV"] ?? "development";
  const cookie = [
    `${ACCESS_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/api",
    `Max-Age=${ACCESS_TOKEN_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(env === "production" ? ["Secure"] : []),
  ].join("; ");
  res.append("Set-Cookie", cookie);
}

function validationError(details: unknown): AppError {
  return new AppError("VALIDATION_ERROR", "Invalid request", details);
}

export function createAuthController(service: AuthService) {
  return {
    register: async (req: Request, res: Response, next: NextFunction) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        next(validationError(parsed.error.flatten()));
        return;
      }

      try {
        await service.register(parsed.data);
        res.status(202).json({
          success: true,
          data: { message: "If this address can be registered, sign in to continue" },
        });
      } catch (error) {
        next(error);
      }
    },
    login: async (req: Request, res: Response, next: NextFunction) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        next(validationError(parsed.error.flatten()));
        return;
      }

      try {
        const user = await service.login(parsed.data);
        setAccessCookie(res, createAccessToken(user));
        res.status(200).json({ success: true, data: { user } });
      } catch (error) {
        next(error);
      }
    },
  };
}
