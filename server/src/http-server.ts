import { createServer } from "node:http";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { PrismaAuthRepository } from "./modules/auth/auth.repository.js";
import { attachRealtime } from "./modules/realtime/realtime.server.js";
import { RealtimeService } from "./modules/realtime/realtime.service.js";

export function createBackendServer() {
  const app = createApp(
    { publish: (name, order) => realtime.publish(name, order) },
    (id) => realtime.disconnectUser(id),
  );
  const server = createServer(app);
  const realtime = attachRealtime(server, new RealtimeService(new PrismaAuthRepository(prisma)));
  return { server, realtime };
}
