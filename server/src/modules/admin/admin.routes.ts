import { RestaurantRole } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRestaurantRole } from "../../middleware/require-restaurant-role.js";
import { PrismaAuthRepository } from "../auth/auth.repository.js";
import { createAdminController } from "./admin.controller.js";
import { PrismaAdminRepository } from "./admin.repository.js";
import { AdminService } from "./admin.service.js";

export function createAdminRouter() {
  const service = new AdminService(new PrismaAdminRepository(prisma), new PrismaAuthRepository(prisma));
  const controller = createAdminController(service);
  const router = Router();
  const viewer = [
    authenticate,
    requireRestaurantRole(
      new PrismaAuthRepository(prisma),
      RestaurantRole.OWNER,
      RestaurantRole.MANAGER,
    ),
  ];
  const owner = [
    authenticate,
    requireRestaurantRole(new PrismaAuthRepository(prisma), RestaurantRole.OWNER),
  ];

  router.get("/:restaurantId/admin/overview", ...viewer, controller.overview);
  router.get("/:restaurantId/admin/revenue", ...viewer, controller.revenue);
  router.get("/:restaurantId/admin/popular-items", ...viewer, controller.popularItems);
  router.get("/:restaurantId/admin/rush", ...viewer, controller.rush);
  router.get("/:restaurantId/admin/staff", ...viewer, controller.listStaff);
  router.post("/:restaurantId/admin/staff", ...owner, controller.addStaff);
  router.patch("/:restaurantId/admin/staff/:memberId", ...owner, controller.updateStaffRole);
  router.delete("/:restaurantId/admin/staff/:memberId", ...owner, controller.removeStaff);
  return router;
}
