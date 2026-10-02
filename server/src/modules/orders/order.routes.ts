import { UserRole } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireUserRole } from "../../middleware/require-user-role.js";
import { createOrderController } from "./order.controller.js";
import { PrismaOrderRepository } from "./order.repository.js";
import type { OrderEvents } from "../realtime/order-events.js";
import { OrderService } from "./order.service.js";

export function createOrderRouter(events?: OrderEvents): Router {
  const controller = createOrderController(new OrderService(new PrismaOrderRepository(prisma), events));
  const router = Router();
  router.use(authenticate, requireUserRole(UserRole.CUSTOMER));
  router.post("/", controller.create);
  router.get("/", controller.history);
  router.get("/:publicId", controller.detail);
  router.post("/:publicId/cancel", controller.cancel);
  return router;
}
