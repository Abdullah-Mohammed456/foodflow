import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { PrismaAuthRepository } from "../auth/auth.repository.js";
import { PrismaOrderRepository } from "../orders/order.repository.js";
import type { OrderEvents } from "../realtime/order-events.js";
import { createKitchenController } from "./kitchen.controller.js";
import { KitchenService } from "./kitchen.service.js";

export function createKitchenRouter(events?: OrderEvents): Router {
  const service = new KitchenService(new PrismaOrderRepository(prisma), new PrismaAuthRepository(prisma), events);
  const controller = createKitchenController(service);
  const router = Router();
  router.use(authenticate);
  router.get("/:restaurantId/kitchen/orders", controller.queue);
  router.patch("/:restaurantId/kitchen/orders/:publicId/status", controller.changeStatus);
  return router;
}
