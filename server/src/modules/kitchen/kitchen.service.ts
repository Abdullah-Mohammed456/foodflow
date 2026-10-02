import { RestaurantRole, type OrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError.js";
import type { RestaurantRoleLookup } from "../../middleware/require-restaurant-role.js";
import type { IOrderRepository } from "../orders/order.repository.js";
import type { OrderQuery } from "../orders/order.schema.js";
import { publicOrder } from "../orders/order.service.js";
import { notifyOrder, type OrderEventName, type OrderEvents } from "../realtime/order-events.js";
import type { KitchenStatusInput } from "./kitchen.schema.js";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED", CONFIRMED: "PREPARING", PREPARING: "READY", READY: "COMPLETED",
};
const statusEvents: Partial<Record<OrderStatus, OrderEventName>> = {
  CONFIRMED: "order.confirmed", PREPARING: "order.preparing", READY: "order.ready", COMPLETED: "order.completed",
};

export class KitchenService {
  constructor(
    private readonly repo: IOrderRepository,
    private readonly roles: RestaurantRoleLookup,
    private readonly events?: OrderEvents,
  ) {}

  private async requireAccess(userId: string, restaurantId: string): Promise<void> {
    const role = await this.roles.findRestaurantRole(userId, restaurantId);
    if (!role || ![RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.KITCHEN].includes(role)) {
      throw new AppError("FORBIDDEN", "Kitchen access denied");
    }
  }

  async queue(userId: string, restaurantId: string, query: OrderQuery) {
    await this.requireAccess(userId, restaurantId);
    const page = await this.repo.listKitchen(restaurantId, query);
    return {
      items: page.items.map(publicOrder),
      pagination: { page: query.page, limit: query.limit, total: page.total, pageCount: Math.ceil(page.total / query.limit) },
    };
  }

  async changeStatus(userId: string, restaurantId: string, publicId: string, input: KitchenStatusInput) {
    await this.requireAccess(userId, restaurantId);
    const current = await this.repo.findRestaurantOrder(restaurantId, publicId);
    if (!current) throw new AppError("NOT_FOUND", "Order not found");
    if (current.revision !== input.revision) throw new AppError("CONFLICT", "Order changed; refresh before retrying");
    if (nextStatus[current.status] !== input.status) throw new AppError("CONFLICT", "Invalid order status transition");
    const order = await this.repo.advanceStatus(restaurantId, publicId, input.revision, current.status, input.status);
    if (!order) throw new AppError("CONFLICT", "Order changed; refresh before retrying");
    const event = statusEvents[order.status];
    if (event) await notifyOrder(this.events, event, order);
    return publicOrder(order);
  }
}
