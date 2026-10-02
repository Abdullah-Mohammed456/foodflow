import type { PrismaClient } from "@prisma/client";

export interface IHealthRepository {
  checkDatabase(): Promise<boolean>;
}

export class PrismaHealthRepository implements IHealthRepository {
  constructor(private readonly db: PrismaClient) {}

  async checkDatabase(): Promise<boolean> {
    await this.db.$queryRaw`SELECT 1`;
    return true;
  }
}
