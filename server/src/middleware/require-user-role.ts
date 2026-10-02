import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

export function requireUserRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError("UNAUTHORIZED", "Authentication required"));
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      next(new AppError("FORBIDDEN", "You do not have access to this resource"));
      return;
    }
    next();
  };
}
