import type { OrderStatus } from "@prisma/client";

export type OrderEventName = "order.created" | "order.confirmed" | "order.preparing" | "order.ready" | "order.completed" | "order.cancelled";
export interface OrderSignal {
  publicId: string;
  restaurantId: string;
  customerId: string;
  status: OrderStatus;
  revision: number;
  updatedAt: Date;
}
export interface OrderEventPayload {
  publicId: string;
  restaurantId: string;
  status: OrderStatus;
  revision: number;
  updatedAt: string;
}
export interface OrderEvents {
  publish(name: OrderEventName, order: OrderSignal): Promise<void>;
}

export async function notifyOrder(events: OrderEvents | undefined, name: OrderEventName, order: OrderSignal): Promise<void> {
  if (!events) return;
  try {
    await events.publish(name, order);
  } catch {
    process.stderr.write("[realtime] Order notification failed; persisted state remains available through the API\n");
  }
}
