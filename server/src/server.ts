import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

async function main(): Promise<void> {
  const env = getEnv();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    process.stdout.write(`[foodflow] API listening on :${env.PORT} (${env.NODE_ENV})\n`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    process.stdout.write(`[foodflow] received ${signal}, shutting down...\n`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  process.stderr.write(`[foodflow] failed to start ${String(err)}\n`);
  process.exit(1);
});
