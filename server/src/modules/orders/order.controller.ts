import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import { cancelOrderSchema, createOrderSchema, orderParamsSchema, orderQuerySchema } from "./order.schema.js";
import type { OrderService } from "./order.service.js";

export function createOrderController(service: OrderService) {
  return {
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.auth) throw new AppError("UNAUTHORIZED", "Authentication required");
        const parsed = createOrderSchema.safeParse(req.body);
        if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invalid checkout", parsed.error.flatten());
        const result = await service.create(req.auth.id, parsed.data);
        res.status(result.replayed ? 200 : 201).json({ success: true, data: result });
      } catch (error) { next(error); }
    },
    history: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.auth) throw new AppError("UNAUTHORIZED", "Authentication required");
        const parsed = orderQuerySchema.safeParse(req.query);
        if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invalid order query", parsed.error.flatten());
        res.json({ success: true, data: await service.history(req.auth.id, parsed.data) });
      } catch (error) { next(error); }
    },
    detail: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.auth) throw new AppError("UNAUTHORIZED", "Authentication required");
        const parsed = orderParamsSchema.safeParse(req.params);
        if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invalid order identifier", parsed.error.flatten());
        res.json({ success: true, data: { order: await service.detail(req.auth.id, parsed.data.publicId) } });
      } catch (error) { next(error); }
    },
    cancel: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.auth) throw new AppError("UNAUTHORIZED", "Authentication required");
        const parsed = orderParamsSchema.safeParse(req.params);
        const body = cancelOrderSchema.safeParse(req.body ?? {});
        if (!parsed.success || !body.success) throw new AppError("VALIDATION_ERROR", "Invalid cancellation request");
        res.json({ success: true, data: { order: await service.cancel(req.auth.id, parsed.data.publicId) } });
      } catch (error) { next(error); }
    },
  };
}
