import type { NextFunction, Request, Response } from "express";
import type { RestaurantRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../errors/AppError.js";

const restaurantIdSchema = z.string().trim().min(1).max(64);

export interface RestaurantRoleLookup {
  findRestaurantRole(
    userId: string,
    restaurantId: string,
  ): Promise<RestaurantRole | null>;
}

export function requireRestaurantRole(
  repository: RestaurantRoleLookup,
  ...allowedRoles: RestaurantRole[]
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const userId = req.auth?.id;
    const restaurantResult = restaurantIdSchema.safeParse(req.params["restaurantId"]);
    if (!userId) {
      next(new AppError("UNAUTHORIZED", "Authentication required"));
      return;
    }
    if (!restaurantResult.success) {
      next(new AppError("VALIDATION_ERROR", "Restaurant ID is invalid"));
      return;
    }

    try {
      const role = await repository.findRestaurantRole(userId, restaurantResult.data);
      if (!role || !allowedRoles.includes(role)) {
        next(new AppError("FORBIDDEN", "You do not have access to this restaurant"));
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
