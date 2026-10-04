import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsedEnv.success) {
  throw new Error("Invalid NEXT_PUBLIC_API_URL configuration");
}

export const API_BASE = new URL(parsedEnv.data.NEXT_PUBLIC_API_URL).origin;

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${typeof window === "undefined" ? API_BASE : ""}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
  });

  const body = (await res.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!res.ok || body === null || body.success === false) {
    const failure = body !== null && body.success === false ? body : null;
    throw new ApiError(
      res.status,
      failure?.error.code ?? "REQUEST_FAILED",
      failure?.error.message ?? `Request failed (${res.status})`,
      failure?.error.details,
    );
  }
  return body.data;
}

export interface HealthData {
  status: "ok";
  uptimeSeconds: number;
  timestamp: string;
}
