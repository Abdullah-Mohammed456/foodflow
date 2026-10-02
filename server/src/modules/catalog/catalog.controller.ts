import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import {
  availabilitySchema,
  categoryCreateSchema,
  categoryParamsSchema,
  categoryUpdateSchema,
  managerMenuQuerySchema,
  menuItemCreateSchema,
  menuItemParamsSchema,
  menuItemUpdateSchema,
  publicMenuQuerySchema,
  restaurantIdParamsSchema,
  restaurantSlugParamsSchema,
  updateRestaurantSchema,
} from "./catalog.schema.js";
import type { CatalogService } from "./catalog.service.js";

function invalidRequest(details: unknown): AppError {
  return new AppError("VALIDATION_ERROR", "Invalid request", details);
}

export function createCatalogController(service: CatalogService) {
  return {
    publicRestaurant: async (req: Request, res: Response, next: NextFunction) => {
      const params = restaurantSlugParamsSchema.safeParse(req.params);
      if (!params.success) {
        next(invalidRequest(params.error.flatten()));
        return;
      }
      try {
        const restaurant = await service.publicRestaurant(params.data.slug);
        res.status(200).json({ success: true, data: { restaurant } });
      } catch (error) {
        next(error);
      }
    },
    updateRestaurant: async (req: Request, res: Response, next: NextFunction) => {
      const params = restaurantIdParamsSchema.safeParse(req.params);
      const body = updateRestaurantSchema.safeParse(req.body);
      if (!params.success || !body.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(body.success ? {} : { body: body.error.flatten() }),
        }));
        return;
      }
      try {
        const restaurant = await service.updateRestaurant(params.data.restaurantId, body.data);
        res.status(200).json({ success: true, data: { restaurant } });
      } catch (error) {
        next(error);
      }
    },
    publicMenu: async (req: Request, res: Response, next: NextFunction) => {
      const params = restaurantSlugParamsSchema.safeParse(req.params);
      const query = publicMenuQuerySchema.safeParse(req.query);
      if (!params.success || !query.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(query.success ? {} : { query: query.error.flatten() }),
        }));
        return;
      }
      try {
        res.status(200).json({
          success: true,
          data: await service.publicMenu(params.data.slug, query.data),
        });
      } catch (error) {
        next(error);
      }
    },
    categories: async (req: Request, res: Response, next: NextFunction) => {
      const params = restaurantIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        next(invalidRequest(params.error.flatten()));
        return;
      }
      try {
        const categories = await service.categories(params.data.restaurantId);
        res.status(200).json({ success: true, data: { categories } });
      } catch (error) {
        next(error);
      }
    },
    createCategory: async (req: Request, res: Response, next: NextFunction) => {
      const params = restaurantIdParamsSchema.safeParse(req.params);
      const body = categoryCreateSchema.safeParse(req.body);
      if (!params.success || !body.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(body.success ? {} : { body: body.error.flatten() }),
        }));
        return;
      }
      try {
        const category = await service.createCategory(params.data.restaurantId, body.data);
        res.status(201).json({ success: true, data: { category } });
      } catch (error) {
        next(error);
      }
    },
    updateCategory: async (req: Request, res: Response, next: NextFunction) => {
      const params = categoryParamsSchema.safeParse(req.params);
      const body = categoryUpdateSchema.safeParse(req.body);
      if (!params.success || !body.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(body.success ? {} : { body: body.error.flatten() }),
        }));
        return;
      }
      try {
        const category = await service.updateCategory(
          params.data.restaurantId,
          params.data.categoryId,
          body.data,
        );
        res.status(200).json({ success: true, data: { category } });
      } catch (error) {
        next(error);
      }
    },
    deleteCategory: async (req: Request, res: Response, next: NextFunction) => {
      const params = categoryParamsSchema.safeParse(req.params);
      if (!params.success) {
        next(invalidRequest(params.error.flatten()));
        return;
      }
      try {
        await service.deleteCategory(params.data.restaurantId, params.data.categoryId);
        res.status(200).json({ success: true, data: { deleted: true } });
      } catch (error) {
        next(error);
      }
    },
    managerMenu: async (req: Request, res: Response, next: NextFunction) => {
      const params = restaurantIdParamsSchema.safeParse(req.params);
      const query = managerMenuQuerySchema.safeParse(req.query);
      if (!params.success || !query.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(query.success ? {} : { query: query.error.flatten() }),
        }));
        return;
      }
      try {
        const data = await service.managerMenu(params.data.restaurantId, query.data);
        res.status(200).json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
    createMenuItem: async (req: Request, res: Response, next: NextFunction) => {
      const params = restaurantIdParamsSchema.safeParse(req.params);
      const body = menuItemCreateSchema.safeParse(req.body);
      if (!params.success || !body.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(body.success ? {} : { body: body.error.flatten() }),
        }));
        return;
      }
      try {
        const item = await service.createMenuItem(params.data.restaurantId, body.data);
        res.status(201).json({ success: true, data: { item } });
      } catch (error) {
        next(error);
      }
    },
    updateMenuItem: async (req: Request, res: Response, next: NextFunction) => {
      const params = menuItemParamsSchema.safeParse(req.params);
      const body = menuItemUpdateSchema.safeParse(req.body);
      if (!params.success || !body.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(body.success ? {} : { body: body.error.flatten() }),
        }));
        return;
      }
      try {
        const item = await service.updateMenuItem(
          params.data.restaurantId,
          params.data.menuItemId,
          body.data,
        );
        res.status(200).json({ success: true, data: { item } });
      } catch (error) {
        next(error);
      }
    },
    updateAvailability: async (req: Request, res: Response, next: NextFunction) => {
      const params = menuItemParamsSchema.safeParse(req.params);
      const body = availabilitySchema.safeParse(req.body);
      if (!params.success || !body.success) {
        next(invalidRequest({
          ...(params.success ? {} : { params: params.error.flatten() }),
          ...(body.success ? {} : { body: body.error.flatten() }),
        }));
        return;
      }
      try {
        const item = await service.updateAvailability(
          params.data.restaurantId,
          params.data.menuItemId,
          body.data.isAvailable,
        );
        res.status(200).json({ success: true, data: { item } });
      } catch (error) {
        next(error);
      }
    },
    deleteMenuItem: async (req: Request, res: Response, next: NextFunction) => {
      const params = menuItemParamsSchema.safeParse(req.params);
      if (!params.success) {
        next(invalidRequest(params.error.flatten()));
        return;
      }
      try {
        await service.deleteMenuItem(params.data.restaurantId, params.data.menuItemId);
        res.status(200).json({ success: true, data: { deleted: true } });
      } catch (error) {
        next(error);
      }
    },
  };
}
