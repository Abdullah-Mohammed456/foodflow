import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { AppError } from "../../errors/AppError.js";
import { getEnv } from "../../config/env.js";
import type { AccessTokenClaims } from "../auth/access-token.js";
import type { RealtimeService } from "./realtime.service.js";
import type { OrderEventName, OrderEventPayload, OrderSignal } from "./order-events.js";

type SubscriptionReply = { success: true; restaurantId: string } | { success: false; error: { code: string; message: string } };
interface ClientEvents {
  "kitchen.subscribe": (input: unknown, reply: (result: SubscriptionReply) => void) => void;
  "kitchen.unsubscribe": (input: unknown, reply: (result: SubscriptionReply) => void) => void;
}
type ServerEvents = Record<OrderEventName, (payload: OrderEventPayload) => void>;
interface SocketData { auth: AccessTokenClaims }
const subscriptionSchema = z.object({ restaurantId: z.string().trim().min(1).max(64) }).strict();
const userRoom = (id: string) => `user:${id}`;
const kitchenRoom = (id: string) => `restaurant:${id}:kitchen`;

export function attachRealtime(server: HttpServer, service: RealtimeService) {
  const env = getEnv();
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>(server, {
    path: "/api/socket.io",
    cors: { origin: env.FRONTEND_URL, credentials: true },
    allowRequest: (request, done) => done(null, request.headers.origin === env.FRONTEND_URL),
    maxHttpBufferSize: 10_000,
  });

  io.use(async (socket, next) => {
    try {
      socket.data.auth = await service.authenticate(socket.handshake.headers.cookie);
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const { id, expiresAt } = socket.data.auth;
    void socket.join(userRoom(id));
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, expiresAt * 1000 - Date.now()));
    expiry.unref();
    socket.once("disconnect", () => clearTimeout(expiry));
    let subscriptions = Promise.resolve();

    for (const action of ["subscribe", "unsubscribe"] as const) {
      socket.on(`kitchen.${action}`, (input, reply) => {
        subscriptions = subscriptions.then(async () => {
          try {
            const parsed = subscriptionSchema.safeParse(input);
            if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invalid kitchen subscription");
            const { restaurantId } = parsed.data;
            await service.authenticate(socket.handshake.headers.cookie);
            if (action === "subscribe") {
              if (!await service.canAccessKitchen(id, restaurantId)) throw new AppError("FORBIDDEN", "Kitchen access denied");
              if (socket.connected) await socket.join(kitchenRoom(restaurantId));
            } else {
              await socket.leave(kitchenRoom(restaurantId));
            }
            if (typeof reply === "function") reply({ success: true, restaurantId });
          } catch (error) {
            const failure = error instanceof AppError ? error : new AppError("INTERNAL_ERROR", "Subscription failed");
            if (typeof reply === "function") reply({ success: false, error: { code: failure.code, message: failure.message } });
          }
        });
      });
    }
  });

  async function publish(name: OrderEventName, order: OrderSignal): Promise<void> {
    const payload: OrderEventPayload = {
      publicId: order.publicId, restaurantId: order.restaurantId, status: order.status,
      revision: order.revision, updatedAt: order.updatedAt.toISOString(),
    };
    const recipients = await io.in([userRoom(order.customerId), kitchenRoom(order.restaurantId)]).fetchSockets();
    for (const socket of recipients) {
      try {
        const auth = await service.authenticate(socket.handshake.headers.cookie);
        if (auth.id === order.customerId) {
          socket.emit(name, payload);
        } else if (await service.canAccessKitchen(auth.id, order.restaurantId)) {
          socket.emit(name, payload);
        } else {
          await socket.leave(kitchenRoom(order.restaurantId));
        }
      } catch {
        socket.disconnect(true);
      }
    }
  }

  return {
    io, publish,
    disconnectUser: (id: string) => io.in(userRoom(id)).disconnectSockets(true),
    close: () => new Promise<void>((resolve) => io.close(() => resolve())),
  };
}
