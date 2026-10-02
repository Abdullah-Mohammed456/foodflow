import cors from "cors";
import express from "express";
import { getEnv } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp() {
  const env = getEnv();
  const app = express();

  app.use(express.json({ limit: "100kb" }));
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/restaurants", catalogRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
