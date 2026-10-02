import { RestaurantRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRestaurantRole } from "../../middleware/require-restaurant-role.js";
import { prisma } from "../../lib/prisma.js";
import { PrismaAuthRepository } from "../auth/auth.repository.js";
import { createCatalogController } from "./catalog.controller.js";
import { PrismaCatalogRepository } from "./catalog.repository.js";
import { CatalogService } from "./catalog.service.js";

const catalogRepository = new PrismaCatalogRepository(prisma);
const authRepository = new PrismaAuthRepository(prisma);
const service = new CatalogService(catalogRepository);
const controller = createCatalogController(service);
const managerAccess = [
  authenticate,
  requireRestaurantRole(authRepository, RestaurantRole.OWNER, RestaurantRole.MANAGER),
];

export const catalogRouter: Router = Router();

catalogRouter.get("/public/:slug", controller.publicRestaurant);
catalogRouter.get("/public/:slug/menu", controller.publicMenu);

catalogRouter.patch("/:restaurantId", ...managerAccess, controller.updateRestaurant);
catalogRouter.get("/:restaurantId/categories", ...managerAccess, controller.categories);
catalogRouter.post("/:restaurantId/categories", ...managerAccess, controller.createCategory);
catalogRouter.patch(
  "/:restaurantId/categories/:categoryId",
  ...managerAccess,
  controller.updateCategory,
);
catalogRouter.delete(
  "/:restaurantId/categories/:categoryId",
  ...managerAccess,
  controller.deleteCategory,
);
catalogRouter.get("/:restaurantId/menu-items", ...managerAccess, controller.managerMenu);
catalogRouter.post("/:restaurantId/menu-items", ...managerAccess, controller.createMenuItem);
catalogRouter.patch(
  "/:restaurantId/menu-items/:menuItemId",
  ...managerAccess,
  controller.updateMenuItem,
);
catalogRouter.patch(
  "/:restaurantId/menu-items/:menuItemId/availability",
  ...managerAccess,
  controller.updateAvailability,
);
catalogRouter.delete(
  "/:restaurantId/menu-items/:menuItemId",
  ...managerAccess,
  controller.deleteMenuItem,
);
