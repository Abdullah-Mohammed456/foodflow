import type { NextFunction, Request, Response } from "express";
import type { HealthService } from "./health.service.js";

export function createHealthController(service: HealthService) {
  return {
    live(_req: Request, res: Response, next: NextFunction): void {
      try {
        res.json({ success: true, data: service.liveness() });
      } catch (err) {
        next(err);
      }
    },
    async ready(_req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        res.json({ success: true, data: await service.readiness() });
      } catch (err) {
        next(err);
      }
    },
  };
}
