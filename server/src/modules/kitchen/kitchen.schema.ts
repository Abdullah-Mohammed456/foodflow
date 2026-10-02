import { z } from "zod";
import { orderQuerySchema } from "../orders/order.schema.js";

const id = z.string().trim().min(1).max(64);
export const kitchenParamsSchema = z.object({ restaurantId: id }).strict();
export const kitchenOrderParamsSchema = z.object({ restaurantId: id, publicId: id }).strict();
export const kitchenQuerySchema = orderQuerySchema.refine(
  (value) => !value.status || ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(value.status),
  { message: "Kitchen queue only includes active orders" },
);
export const kitchenStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "READY", "COMPLETED"]),
  revision: z.number().int().min(0).max(2147483646),
}).strict();
export type KitchenStatusInput = z.infer<typeof kitchenStatusSchema>;
