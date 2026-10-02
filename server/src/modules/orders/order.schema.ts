import { MenuItemSize, OrderStatus, OrderType } from "@prisma/client";
import { z } from "zod";

const id = z.string().trim().min(1).max(64);

export const createOrderSchema = z.object({
  restaurantId: id,
  checkoutKey: z.string().uuid(),
  orderType: z.nativeEnum(OrderType),
  items: z.array(z.object({
    menuItemId: id,
    size: z.nativeEnum(MenuItemSize),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(50),
  notes: z.string().trim().max(1000).optional(),
  deliveryAddress: z.string().trim().min(5).max(500).optional(),
}).strict().superRefine((value, context) => {
  const keys = value.items.map((item) => `${item.menuItemId}:${item.size}`);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Combine duplicate item sizes into one quantity" });
  }
  if (value.orderType === OrderType.DELIVERY && !value.deliveryAddress) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryAddress"], message: "Delivery orders require an address" });
  }
  if (value.orderType !== OrderType.DELIVERY && value.deliveryAddress !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryAddress"], message: "An address is only accepted for delivery" });
  }
});

export const orderParamsSchema = z.object({ publicId: id }).strict();
export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
}).strict();
export const cancelOrderSchema = z.object({}).strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
