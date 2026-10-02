import { UserRole } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireUserRole } from "../../middleware/require-user-role.js";
import { createOrderController } from "./order.controller.js";
import { PrismaOrderRepository } from "./order.repository.js";
import { OrderService } from "./order.service.js";

const controller = createOrderController(new OrderService(new PrismaOrderRepository(prisma)));
export const orderRouter: Router = Router();
orderRouter.use(authenticate, requireUserRole(UserRole.CUSTOMER));
orderRouter.post("/", controller.create);
orderRouter.get("/", controller.history);
orderRouter.get("/:publicId", controller.detail);
orderRouter.post("/:publicId/cancel", controller.cancel);
