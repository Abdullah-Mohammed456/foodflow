import { Prisma, type OrderStatus, type PrismaClient } from "@prisma/client";
import type { OrderQuery } from "./order.schema.js";

const orderDetails = { items: { orderBy: { id: "asc" as const } } };
export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderDetails }>;
export type CheckoutMenuItem = Prisma.MenuItemGetPayload<{
  include: { category: true; variants: true };
}>;
export type OrderCreateData = Prisma.OrderUncheckedCreateInput;

export class OrderWriteConflictError extends Error {}

export interface IOrderTransaction {
  findCheckout(customerId: string, checkoutKey: string): Promise<OrderWithItems | null>;
  findRestaurant(id: string): Promise<{ id: string; isOpen: boolean } | null>;
  checkoutItems(ids: string[]): Promise<CheckoutMenuItem[]>;
  create(data: OrderCreateData): Promise<OrderWithItems>;
}

export interface IOrderRepository {
  transaction<T>(work: (repo: IOrderTransaction) => Promise<T>): Promise<T>;
  findCustomerOrder(customerId: string, publicId: string): Promise<OrderWithItems | null>;
  list(customerId: string, query: OrderQuery): Promise<{ items: OrderWithItems[]; total: number }>;
  cancelPending(customerId: string, publicId: string): Promise<OrderWithItems | null>;
  findRestaurantOrder(restaurantId: string, publicId: string): Promise<OrderWithItems | null>;
  listKitchen(restaurantId: string, query: OrderQuery): Promise<{ items: OrderWithItems[]; total: number }>;
  advanceStatus(restaurantId: string, publicId: string, revision: number, from: OrderStatus, to: OrderStatus): Promise<OrderWithItems | null>;
}

export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async transaction<T>(work: (repo: IOrderTransaction) => Promise<T>): Promise<T> {
    try {
      return await this.db.$transaction((tx) => work(this.checkoutRepository(tx)), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
        throw new OrderWriteConflictError("Concurrent checkout conflict");
      }
      throw error;
    }
  }

  private checkoutRepository(db: Prisma.TransactionClient): IOrderTransaction {
    return {
      findCheckout: (customerId, checkoutKey) => db.order.findUnique({
        where: { customerId_checkoutKey: { customerId, checkoutKey } }, include: orderDetails,
      }),
      findRestaurant: (id) => db.restaurant.findUnique({ where: { id }, select: { id: true, isOpen: true } }),
      checkoutItems: (ids) => db.menuItem.findMany({
        where: { id: { in: ids } }, include: { category: true, variants: true },
      }),
      create: (data) => db.order.create({ data, include: orderDetails }),
    };
  }

  findCustomerOrder(customerId: string, publicId: string) {
    return this.db.order.findFirst({ where: { customerId, publicId }, include: orderDetails });
  }

  async list(customerId: string, query: OrderQuery) {
    const where: Prisma.OrderWhereInput = { customerId, ...(query.status ? { status: query.status } : {}) };
    const [total, items] = await this.db.$transaction([
      this.db.order.count({ where }),
      this.db.order.findMany({
        where, include: orderDetails, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit, take: query.limit,
      }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { items, total };
  }

  findRestaurantOrder(restaurantId: string, publicId: string) {
    return this.db.order.findFirst({ where: { restaurantId, publicId }, include: orderDetails });
  }

  async listKitchen(restaurantId: string, query: OrderQuery) {
    const where: Prisma.OrderWhereInput = {
      restaurantId, status: query.status ?? { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
    };
    const [total, items] = await this.db.$transaction([
      this.db.order.count({ where }),
      this.db.order.findMany({
        where, include: orderDetails, orderBy: [{ prepDueAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit, take: query.limit,
      }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { items, total };
  }

  async cancelPending(customerId: string, publicId: string) {
    return this.db.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { customerId, publicId, status: "PENDING" }, data: { status: "CANCELLED", revision: { increment: 1 } },
      });
      return result.count ? tx.order.findFirst({ where: { customerId, publicId }, include: orderDetails }) : null;
    });
  }

  async advanceStatus(restaurantId: string, publicId: string, revision: number, from: OrderStatus, to: OrderStatus) {
    return this.db.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { restaurantId, publicId, revision, status: from }, data: { status: to, revision: { increment: 1 } },
      });
      return result.count ? tx.order.findFirst({ where: { restaurantId, publicId }, include: orderDetails }) : null;
    });
  }
}
