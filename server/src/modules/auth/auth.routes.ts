import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { createAuthController } from "./auth.controller.js";
import { PrismaAuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { createAuthRateLimiters } from "./auth.rate-limit.js";

const repository = new PrismaAuthRepository(prisma);
const service = new AuthService(repository);
const controller = createAuthController(service);
const limits = createAuthRateLimiters();

export const authRouter: Router = Router();

authRouter.post("/register", limits.register, controller.register);
authRouter.post("/login", limits.login, controller.login);
authRouter.post("/logout", controller.logout);
authRouter.get("/me", authenticate, controller.me);
authRouter.patch("/me", authenticate, controller.updateMe);
