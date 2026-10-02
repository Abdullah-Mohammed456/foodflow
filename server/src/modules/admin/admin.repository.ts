import { Prisma, type PrismaClient, type RestaurantRole } from "@prisma/client";

export interface StaffMember {
  id: string;
  role: RestaurantRole;
  createdAt: Date;
  user: { id: string; email: string; name: string };
}

export interface IAdminRepository {
  findRestaurant(id: string): Promise<{ id: string } | null>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  listStaff(restaurantId: string): Promise<StaffMember[]>;
  findStaffMember(restaurantId: string, memberId: string): Promise<(StaffMember & { userId: string }) | null>;
  countOwners(restaurantId: string): Promise<number>;
  addStaff(restaurantId: string, userId: string, role: RestaurantRole): Promise<StaffMember>;
  updateStaffRole(restaurantId: string, memberId: string, role: RestaurantRole): Promise<StaffMember>;
  removeStaff(restaurantId: string, memberId: string): Promise<void>;
  overviewTotals(restaurantId: string, from?: Date, to?: Date): Promise<{
    totalOrders: number;
    totalRevenue: Prisma.Decimal;
    statusCounts: Array<{ status: string; count: number }>;
    typeCounts: Array<{ orderType: string; count: number }>;
    activeQueue: number;
  }>;
  ordersInRange(restaurantId: string, from?: Date, to?: Date): Promise<
    Array<{ createdAt: Date; updatedAt: Date; status: string; total: Prisma.Decimal }>
  >;
  popularItems(restaurantId: string, from?: Date, to?: Date, limit?: number): Promise<
    Array<{ menuItemId: string; quantity: number; revenue: Prisma.Decimal }>
  >;
  menuItemDetails(ids: string[]): Promise<
    Array<{ id: string; name: string; isCombo: boolean; category: { name: string } }>
  >;
}

const staffSelect = {
  id: true,
  role: true,
  createdAt: true,
  userId: true,
  user: { select: { id: true, email: true, name: true } },
} as const;

export class PrismaAdminRepository implements IAdminRepository {
  constructor(private readonly db: PrismaClient) {}

  findRestaurant(id: string) {
    return this.db.restaurant.findUnique({ where: { id }, select: { id: true } });
  }

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email }, select: { id: true } });
  }

  listStaff(restaurantId: string): Promise<StaffMember[]> {
    return this.db.restaurantMember.findMany({
      where: { restaurantId },
      select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true, name: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  findStaffMember(restaurantId: string, memberId: string) {
    return this.db.restaurantMember.findFirst({
      where: { id: memberId, restaurantId },
      select: staffSelect,
    });
  }

  countOwners(restaurantId: string): Promise<number> {
    return this.db.restaurantMember.count({ where: { restaurantId, role: "OWNER" } });
  }

  async addStaff(restaurantId: string, userId: string, role: RestaurantRole): Promise<StaffMember> {
    try {
      return await this.db.restaurantMember.create({
        data: { restaurantId, userId, role },
        select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true, name: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = new Error("Staff member already exists");
        existing.name = "StaffConflictError";
        throw existing;
      }
      throw error;
    }
  }

  updateStaffRole(restaurantId: string, memberId: string, role: RestaurantRole): Promise<StaffMember> {
    return this.db.restaurantMember.update({
      where: { id: memberId },
      data: { role },
      select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true, name: true } } },
    });
  }

  async removeStaff(restaurantId: string, memberId: string): Promise<void> {
    await this.db.restaurantMember.deleteMany({ where: { id: memberId, restaurantId } });
  }

  async overviewTotals(restaurantId: string, from?: Date, to?: Date) {
    const range = from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};
    const where: Prisma.OrderWhereInput = { restaurantId, ...range };
    const [totalOrders, revenue, statusRows, typeRows, activeQueue] = await this.db.$transaction([
      this.db.order.count({ where }),
      this.db.order.aggregate({ where: { ...where, status: { not: "CANCELLED" } }, _sum: { total: true } }),
      this.db.order.findMany({ where, select: { status: true } }),
      this.db.order.findMany({ where, select: { orderType: true } }),
      this.db.order.count({ where: { restaurantId, status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] } } }),
    ]);
    const statusMap = new Map<string, number>();
    for (const row of statusRows) statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1);
    const typeMap = new Map<string, number>();
    for (const row of typeRows) typeMap.set(row.orderType, (typeMap.get(row.orderType) ?? 0) + 1);
    return {
      totalOrders,
      totalRevenue: revenue._sum.total ?? new Prisma.Decimal(0),
      statusCounts: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
      typeCounts: [...typeMap.entries()].map(([orderType, count]) => ({ orderType, count })),
      activeQueue,
    };
  }

  ordersInRange(restaurantId: string, from?: Date, to?: Date) {
    return this.db.order.findMany({
      where: {
        restaurantId,
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      select: { createdAt: true, updatedAt: true, status: true, total: true },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });
  }

  async popularItems(restaurantId: string, from?: Date, to?: Date, limit = 10) {
    const rows = await this.db.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: {
          restaurantId,
          status: { not: "CANCELLED" },
          ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });
    return rows.map((row) => ({
      menuItemId: row.menuItemId,
      quantity: row._sum.quantity ?? 0,
      revenue: row._sum.lineTotal ?? new Prisma.Decimal(0),
    }));
  }

  menuItemDetails(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.db.menuItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, isCombo: true, category: { select: { name: true } } },
    });
  }
}
