import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import { createAccessToken } from "./access-token.js";
import { clearAccessCookie, setAccessCookie } from "./auth-cookie.js";
import type { AuthService } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

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
    me: async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.auth?.id;
      if (!userId) {
        next(new AppError("UNAUTHORIZED", "Authentication required"));
        return;
      }
      try {
        const user = await service.currentUser(userId);
        res.status(200).json({ success: true, data: { user } });
      } catch (error) {
        next(error);
      }
    },
    logout: (_req: Request, res: Response) => {
      clearAccessCookie(res);
      res.status(200).json({ success: true, data: { message: "Logged out" } });
    },
  };
}
