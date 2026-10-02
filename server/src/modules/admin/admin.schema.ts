import { RestaurantRole } from "@prisma/client";
import { z } from "zod";

const idSchema = z.string().trim().min(1).max(64);
const isoDateSchema = z.string().trim().datetime({ offset: true }).max(64);

export const adminRestaurantParamsSchema = z.object({ restaurantId: idSchema }).strict();

export const adminRangeQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
}).strict();

export const revenueQuerySchema = adminRangeQuerySchema.extend({
  granularity: z.enum(["day", "hour"]).default("day"),
}).strict();

export const popularItemsQuerySchema = adminRangeQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict();

export const rushQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
}).strict();

export const staffCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.nativeEnum(RestaurantRole),
}).strict();

export const staffParamsSchema = z.object({
  restaurantId: idSchema,
  memberId: idSchema,
}).strict();

export const staffUpdateSchema = z.object({
  role: z.nativeEnum(RestaurantRole),
}).strict();

export type AdminRangeQuery = z.infer<typeof adminRangeQuerySchema>;
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;
export type PopularItemsQuery = z.infer<typeof popularItemsQuerySchema>;
export type RushQuery = z.infer<typeof rushQuerySchema>;
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
