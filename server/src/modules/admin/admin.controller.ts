import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import {
  adminRangeQuerySchema,
  adminRestaurantParamsSchema,
  popularItemsQuerySchema,
  revenueQuerySchema,
  rushQuerySchema,
  staffCreateSchema,
  staffParamsSchema,
  staffUpdateSchema,
} from "./admin.schema.js";
import type { AdminService } from "./admin.service.js";

function invalidRequest(details: unknown): AppError {
  return new AppError("VALIDATION_ERROR", "Invalid request", details);
}

function requireAuthId(req: Request): string {
  if (!req.auth) throw new AppError("UNAUTHORIZED", "Authentication required");
  return req.auth.id;
}

export function createAdminController(service: AdminService) {
  return {
    overview: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = adminRestaurantParamsSchema.safeParse(req.params);
        const query = adminRangeQuerySchema.safeParse(req.query);
        if (!params.success || !query.success) throw invalidRequest({ params: params.success ? undefined : params.error.flatten(), query: query.success ? undefined : query.error.flatten() });
        res.json({ success: true, data: await service.overview(requireAuthId(req), params.data.restaurantId, query.data.from, query.data.to) });
      } catch (error) { next(error); }
    },
    revenue: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = adminRestaurantParamsSchema.safeParse(req.params);
        const query = revenueQuerySchema.safeParse(req.query);
        if (!params.success || !query.success) throw invalidRequest({ params: params.success ? undefined : params.error.flatten(), query: query.success ? undefined : query.error.flatten() });
        res.json({ success: true, data: await service.revenue(requireAuthId(req), params.data.restaurantId, query.data) });
      } catch (error) { next(error); }
    },
    popularItems: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = adminRestaurantParamsSchema.safeParse(req.params);
        const query = popularItemsQuerySchema.safeParse(req.query);
        if (!params.success || !query.success) throw invalidRequest({ params: params.success ? undefined : params.error.flatten(), query: query.success ? undefined : query.error.flatten() });
        res.json({ success: true, data: await service.popularItems(requireAuthId(req), params.data.restaurantId, query.data) });
      } catch (error) { next(error); }
    },
    rush: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = adminRestaurantParamsSchema.safeParse(req.params);
        const query = rushQuerySchema.safeParse(req.query);
        if (!params.success || !query.success) throw invalidRequest({ params: params.success ? undefined : params.error.flatten(), query: query.success ? undefined : query.error.flatten() });
        res.json({ success: true, data: await service.rush(requireAuthId(req), params.data.restaurantId, query.data) });
      } catch (error) { next(error); }
    },
    listStaff: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = adminRestaurantParamsSchema.safeParse(req.params);
        if (!params.success) throw invalidRequest(params.error.flatten());
        res.json({ success: true, data: await service.listStaff(requireAuthId(req), params.data.restaurantId) });
      } catch (error) { next(error); }
    },
    addStaff: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = adminRestaurantParamsSchema.safeParse(req.params);
        const body = staffCreateSchema.safeParse(req.body);
        if (!params.success || !body.success) throw invalidRequest({ params: params.success ? undefined : params.error.flatten(), body: body.success ? undefined : body.error.flatten() });
        res.status(201).json({ success: true, data: await service.addStaff(requireAuthId(req), params.data.restaurantId, body.data) });
      } catch (error) { next(error); }
    },
    updateStaffRole: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = staffParamsSchema.safeParse(req.params);
        const body = staffUpdateSchema.safeParse(req.body);
        if (!params.success || !body.success) throw invalidRequest({ params: params.success ? undefined : params.error.flatten(), body: body.success ? undefined : body.error.flatten() });
        res.json({ success: true, data: await service.updateStaffRole(requireAuthId(req), params.data.restaurantId, params.data.memberId, body.data) });
      } catch (error) { next(error); }
    },
    removeStaff: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = staffParamsSchema.safeParse(req.params);
        if (!params.success) throw invalidRequest(params.error.flatten());
        res.json({ success: true, data: await service.removeStaff(requireAuthId(req), params.data.restaurantId, params.data.memberId) });
      } catch (error) { next(error); }
    },
  };
}
