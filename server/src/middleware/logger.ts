import type { NextFunction, Request, Response } from "express";

function safeLog(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength).concat("…") : value;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on("finish", () => {
    const requestId = (req as Request & { requestId?: string }).requestId ?? "-";
    const line = JSON.stringify({
      requestId,
      method: req.method,
      path: safeLog(req.originalUrl.split("?")[0] ?? req.originalUrl, 200),
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
    process.stdout.write(`${line}\n`);
  });
  next();
}
