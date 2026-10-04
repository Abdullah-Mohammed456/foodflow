import "dotenv/config";
import { randomBytes } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { PrismaClient, RestaurantRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hashPassword } from "./lib/password.js";

async function main() {
  const email = z.string().email().parse(process.env["BOOTSTRAP_OWNER_EMAIL"]).toLowerCase();
  const databaseUrl = z.string().min(1).parse(process.env["DATABASE_URL"]);
  const file = resolve(process.env["BOOTSTRAP_CREDENTIALS_FILE"] ?? ".owner-credentials.json");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  let createdFile = false;
  try {
    const restaurant = await db.restaurant.findUniqueOrThrow({ where: { slug: "foodflow" } });
    const existing = await db.user.findUnique({ where: { email } });
    const password = existing ? null : randomBytes(24).toString("base64url");
    if (password) {
      await writeFile(file, JSON.stringify({ email, password }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
      createdFile = true;
    }
    const passwordHash = password ? await hashPassword(password) : null;
    await db.$transaction(async (tx) => {
      const user = existing ?? await tx.user.create({ data: { email, name: "Food Flow Owner", passwordHash: passwordHash! } });
      await tx.restaurantMember.upsert({
        where: { userId_restaurantId: { userId: user.id, restaurantId: restaurant.id } },
        create: { userId: user.id, restaurantId: restaurant.id, role: RestaurantRole.OWNER },
        update: { role: RestaurantRole.OWNER },
      });
    });
    process.stdout.write(existing ? "Existing account granted OWNER; password unchanged.\n" : `Owner created. Private credentials saved at ${file}\n`);
  } catch (error) {
    if (createdFile) await unlink(file);
    throw error;
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}
main().catch(() => { process.stderr.write("Owner setup failed. Check database access, email, seeded restaurant, and credentials file.\n"); process.exitCode = 1; });
