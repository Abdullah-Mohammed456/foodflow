import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/AppError.js";
import { OrderWriteConflictError, type IOrderRepository, type OrderWithItems } from "./order.repository.js";
import { notifyOrder, type OrderEvents } from "../realtime/order-events.js";
import type { CreateOrderInput, OrderQuery } from "./order.schema.js";

export function publicOrder(order: OrderWithItems) {
  return {
    id: order.id, publicId: order.publicId, restaurantId: order.restaurantId,
    orderType: order.orderType, status: order.status, revision: order.revision, prepDueAt: order.prepDueAt,
    subtotal: order.subtotal, deliveryFee: order.deliveryFee, discount: order.discount, total: order.total,
    notes: order.notes, deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt, updatedAt: order.updatedAt, items: order.items,
  };
}

export class OrderService {
  constructor(private readonly repo: IOrderRepository, private readonly events?: OrderEvents) {}

  async create(customerId: string, input: CreateOrderInput) {
    const requestHash = createHash("sha256").update(JSON.stringify({
      restaurantId: input.restaurantId,
      orderType: input.orderType,
      notes: input.notes ?? "",
      deliveryAddress: input.deliveryAddress ?? "",
      items: [...input.items].sort((a, b) =>
        a.menuItemId.localeCompare(b.menuItemId) || a.size.localeCompare(b.size)),
    })).digest("hex");

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await this.repo.transaction(async (repo) => {
          const existing = await repo.findCheckout(customerId, input.checkoutKey);
          if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new AppError("CONFLICT", "This checkout key was already used for a different order");
            }
            return { order: publicOrder(existing), replayed: true };
          }
          const restaurant = await repo.findRestaurant(input.restaurantId);
          if (!restaurant) throw new AppError("NOT_FOUND", "Restaurant not found");
          if (!restaurant.isOpen) throw new AppError("CONFLICT", "The restaurant is closed");

          const menu = await repo.checkoutItems(input.items.map((item) => item.menuItemId));
          const items = input.items.map((line) => {
            const item = menu.find((candidate) => candidate.id === line.menuItemId);
            if (!item || item.restaurantId !== restaurant.id) {
              throw new AppError("VALIDATION_ERROR", "All items must belong to the selected restaurant");
            }
            if (!item.isAvailable || !item.category.isActive) {
              throw new AppError("CONFLICT", "An item is no longer available", { menuItemId: item.id });
            }
            const variant = item.variants.find((candidate) => candidate.size === line.size);
            if (!variant) throw new AppError("VALIDATION_ERROR", "Invalid item size", { menuItemId: item.id });
            if (!variant.isAvailable) throw new AppError("CONFLICT", "The selected size is no longer available", { menuItemId: item.id });
            const unitPrice = new Prisma.Decimal(variant.price);
            if (unitPrice.lte(0) || unitPrice.decimalPlaces() > 2) {
              throw new AppError("CONFLICT", "The selected item has an invalid price");
            }
            return {
              menuItemId: item.id,
              menuItemVariantId: variant.id,
              nameSnapshot: item.name,
              descriptionSnapshot: item.description,
              sizeSnapshot: variant.size,
              isComboSnapshot: item.isCombo,
              prepTimeMinutesSnapshot: item.prepTimeMinutes,
              unitPrice,
              quantity: line.quantity,
              lineTotal: unitPrice.mul(line.quantity),
            };
          });
          const subtotal = items.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0));
          if (subtotal.gt("99999999.99")) throw new AppError("VALIDATION_ERROR", "Order total exceeds the supported limit");
          const createdAt = new Date();
          const prepDueAt = new Date(createdAt.getTime() + Math.max(...items.map((item) => item.prepTimeMinutesSnapshot)) * 60_000);
          const order = await repo.create({
            customerId, restaurantId: restaurant.id, checkoutKey: input.checkoutKey, requestHash,
            orderType: input.orderType, notes: input.notes, deliveryAddress: input.deliveryAddress,
            subtotal, deliveryFee: 0, discount: 0, total: subtotal, createdAt, prepDueAt,
            items: { create: items },
          });
          return { order: publicOrder(order), replayed: false };
        });
        if (!result.replayed) await notifyOrder(this.events, "order.created", { ...result.order, customerId });
        return result;
      } catch (error) {
        if (!(error instanceof OrderWriteConflictError)) throw error;
        if (attempt === 2) throw new AppError("CONFLICT", "Checkout changed concurrently; retry with the same checkout key");
      }
    }
    throw new AppError("CONFLICT", "Checkout could not be completed");
  }

  async detail(customerId: string, publicId: string) {
    const order = await this.repo.findCustomerOrder(customerId, publicId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found");
    return publicOrder(order);
  }

  async history(customerId: string, query: OrderQuery) {
    const page = await this.repo.list(customerId, query);
    return {
      items: page.items.map(publicOrder),
      pagination: { page: query.page, limit: query.limit, total: page.total, pageCount: Math.ceil(page.total / query.limit) },
    };
  }

  async cancel(customerId: string, publicId: string) {
    const cancelled = await this.repo.cancelPending(customerId, publicId);
    if (cancelled) {
      await notifyOrder(this.events, "order.cancelled", cancelled);
      return publicOrder(cancelled);
    }
    const order = await this.detail(customerId, publicId);
    if (order.status === "CANCELLED") return order;
    throw new AppError("CONFLICT", "Only pending orders can be cancelled");
  }
}
