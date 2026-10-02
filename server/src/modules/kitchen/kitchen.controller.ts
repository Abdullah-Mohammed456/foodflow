import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import { kitchenOrderParamsSchema, kitchenParamsSchema, kitchenQuerySchema, kitchenStatusSchema } from "./kitchen.schema.js";
import type { KitchenService } from "./kitchen.service.js";

export function createKitchenController(service: KitchenService) {
  return {
    queue: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.auth) throw new AppError("UNAUTHORIZED", "Authentication required");
        const params = kitchenParamsSchema.safeParse(req.params);
        const query = kitchenQuerySchema.safeParse(req.query);
        if (!params.success || !query.success) throw new AppError("VALIDATION_ERROR", "Invalid kitchen query");
        res.json({ success: true, data: await service.queue(req.auth.id, params.data.restaurantId, query.data) });
      } catch (error) { next(error); }
    },
    changeStatus: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.auth) throw new AppError("UNAUTHORIZED", "Authentication required");
        const params = kitchenOrderParamsSchema.safeParse(req.params);
        const body = kitchenStatusSchema.safeParse(req.body);
        if (!params.success || !body.success) throw new AppError("VALIDATION_ERROR", "Invalid kitchen status request");
        const order = await service.changeStatus(req.auth.id, params.data.restaurantId, params.data.publicId, body.data);
        res.json({ success: true, data: { order } });
      } catch (error) { next(error); }
    },
  };
}
