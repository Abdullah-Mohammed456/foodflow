import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get("x-request-id");
  const id = incoming && incoming.length >= 8 && incoming.length <= 128 ? incoming : randomUUID();
  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
