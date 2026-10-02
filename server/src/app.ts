import cors from "cors";
import express from "express";
import { getEnv } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { createOrderRouter } from "./modules/orders/order.routes.js";
import { createKitchenRouter } from "./modules/kitchen/kitchen.routes.js";
import type { OrderEvents } from "./modules/realtime/order-events.js";
import { readAccessCookie } from "./middleware/authenticate.js";
import { verifyAccessToken } from "./modules/auth/access-token.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp(events?: OrderEvents, disconnectUser?: (id: string) => void) {
  const env = getEnv();
  const app = express();

  app.set("trust proxy", env.TRUST_PROXY);
  app.use(express.json({ limit: "100kb" }));
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  app.use("/health", healthRouter);
  app.post("/api/auth/logout", (req, _res, next) => {
    const token = readAccessCookie(req.get("cookie"));
    const auth = token ? verifyAccessToken(token) : null;
    if (auth) disconnectUser?.(auth.id);
    next();
  });
  app.use("/api/auth", authRouter);
  app.use("/api/restaurants", catalogRouter);

  app.use("/api/orders", createOrderRouter(events));
  app.use("/api/restaurants", createKitchenRouter(events));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
