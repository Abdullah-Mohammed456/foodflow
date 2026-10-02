import { Prisma, RestaurantRole } from "@prisma/client";
import { AppError } from "../../errors/AppError.js";
import type { RestaurantRoleLookup } from "../../middleware/require-restaurant-role.js";
import type { IAdminRepository } from "./admin.repository.js";
import type {
  PopularItemsQuery,
  RevenueQuery,
  RushQuery,
  StaffCreateInput,
  StaffUpdateInput,
} from "./admin.schema.js";

const MAX_RANGE_DAYS = 90;

function toDate(value: string | undefined, field: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError("VALIDATION_ERROR", `Invalid ${field} date`);
  return date;
}

function requireRange(from?: Date, to?: Date): void {
  if (from && to && from > to) throw new AppError("VALIDATION_ERROR", "from must be before to");
  if (from && to && to.getTime() - from.getTime() > MAX_RANGE_DAYS * 24 * 3600 * 1000) {
    throw new AppError("VALIDATION_ERROR", `Date range must not exceed ${MAX_RANGE_DAYS} days`);
  }
}

function decimalToString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

export class AdminService {
  constructor(
    private readonly repo: IAdminRepository,
    private readonly roles: RestaurantRoleLookup,
  ) {}

  private async requireRestaurant(restaurantId: string): Promise<void> {
    const restaurant = await this.repo.findRestaurant(restaurantId);
    if (!restaurant) throw new AppError("NOT_FOUND", "Restaurant not found");
  }

  private async requireManager(userId: string, restaurantId: string): Promise<void> {
    const role = await this.roles.findRestaurantRole(userId, restaurantId);
    const allowed: RestaurantRole[] = [RestaurantRole.OWNER, RestaurantRole.MANAGER];
    if (!role || !allowed.includes(role)) {
      throw new AppError("FORBIDDEN", "You do not have access to this restaurant");
    }
  }

  private async requireOwner(userId: string, restaurantId: string): Promise<void> {
    const role = await this.roles.findRestaurantRole(userId, restaurantId);
    if (role !== RestaurantRole.OWNER) {
      throw new AppError("FORBIDDEN", "Only restaurant owners can manage staff");
    }
  }

  async overview(userId: string, restaurantId: string, fromRaw?: string, toRaw?: string) {
    await this.requireRestaurant(restaurantId);
    await this.requireManager(userId, restaurantId);
    const from = toDate(fromRaw, "from");
    const to = toDate(toRaw, "to");
    requireRange(from, to);
    const totals = await this.repo.overviewTotals(restaurantId, from, to);
    const orders = await this.repo.ordersInRange(restaurantId, from, to);
    const completed = orders.filter((order) => order.status === "COMPLETED");
    const fulfillmentMinutes = completed.map(
      (order) => (order.updatedAt.getTime() - order.createdAt.getTime()) / 60000,
    );
    const averageFulfillmentMinutes = fulfillmentMinutes.length
      ? fulfillmentMinutes.reduce((sum, value) => sum + value, 0) / fulfillmentMinutes.length
      : null;
    return {
      totalOrders: totals.totalOrders,
      totalRevenue: decimalToString(totals.totalRevenue),
      averageOrderValue: totals.totalOrders
        ? decimalToString(totals.totalRevenue.div(totals.totalOrders))
        : "0.00",
      activeQueue: totals.activeQueue,
      completedOrders: completed.length,
      averageFulfillmentMinutes:
        averageFulfillmentMinutes === null ? null : Math.round(averageFulfillmentMinutes * 10) / 10,
      byStatus: totals.statusCounts,
      byOrderType: totals.typeCounts,
    };
  }

  async revenue(userId: string, restaurantId: string, query: RevenueQuery) {
    await this.requireRestaurant(restaurantId);
    await this.requireManager(userId, restaurantId);
    const from = toDate(query.from, "from");
    const to = toDate(query.to, "to");
    requireRange(from, to);
    const orders = await this.repo.ordersInRange(restaurantId, from, to);
    const buckets = new Map<string, { orders: number; revenue: Prisma.Decimal }>();
    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      const key = query.granularity === "hour"
        ? order.createdAt.toISOString().slice(0, 13).concat(":00:00.000Z")
        : order.createdAt.toISOString().slice(0, 10);
      const current = buckets.get(key) ?? { orders: 0, revenue: new Prisma.Decimal(0) };
      current.orders += 1;
      current.revenue = current.revenue.add(order.total);
      buckets.set(key, current);
    }
    return {
      granularity: query.granularity,
      buckets: [...buckets.entries()]
        .sort(([left], [right]) => (left < right ? -1 : 1))
        .map(([bucket, value]) => ({
          bucket,
          orders: value.orders,
          revenue: decimalToString(value.revenue),
        })),
    };
  }

  async popularItems(userId: string, restaurantId: string, query: PopularItemsQuery) {
    await this.requireRestaurant(restaurantId);
    await this.requireManager(userId, restaurantId);
    const from = toDate(query.from, "from");
    const to = toDate(query.to, "to");
    requireRange(from, to);
    const rows = await this.repo.popularItems(restaurantId, from, to, query.limit);
    const details = await this.repo.menuItemDetails(rows.map((row) => row.menuItemId));
    const byId = new Map(details.map((item) => [item.id, item]));
    return {
      items: rows.map((row) => {
        const item = byId.get(row.menuItemId);
        return {
          menuItemId: row.menuItemId,
          name: item?.name ?? "Removed item",
          category: item?.category.name ?? "Unknown",
          isCombo: item?.isCombo ?? false,
          quantity: row.quantity,
          revenue: decimalToString(row.revenue),
        };
      }),
    };
  }

  async rush(userId: string, restaurantId: string, query: RushQuery) {
    await this.requireRestaurant(restaurantId);
    await this.requireManager(userId, restaurantId);
    const to = new Date();
    const from = new Date(to.getTime() - query.days * 24 * 3600 * 1000);
    const orders = await this.repo.ordersInRange(restaurantId, from, to);
    const perHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      perHour[order.createdAt.getUTCHours()]!.orders += 1;
    }
    const peak = perHour.reduce((best, current) => (current.orders > best.orders ? current : best), perHour[0]!);
    return { days: query.days, perHourUtc: perHour, peakHourUtc: peak.hour, peakOrders: peak.orders };
  }

  async listStaff(userId: string, restaurantId: string) {
    await this.requireRestaurant(restaurantId);
    await this.requireManager(userId, restaurantId);
    return { members: await this.repo.listStaff(restaurantId) };
  }

  async addStaff(userId: string, restaurantId: string, input: StaffCreateInput) {
    await this.requireRestaurant(restaurantId);
    await this.requireOwner(userId, restaurantId);
    const target = await this.repo.findUserByEmail(input.email);
    if (!target) throw new AppError("NOT_FOUND", "User with this email does not exist");
    try {
      const member = await this.repo.addStaff(restaurantId, target.id, input.role);
      return { member };
    } catch (error) {
      if (error instanceof Error && error.name === "StaffConflictError") {
        throw new AppError("CONFLICT", "This user is already a staff member");
      }
      throw error;
    }
  }

  async updateStaffRole(userId: string, restaurantId: string, memberId: string, input: StaffUpdateInput) {
    await this.requireRestaurant(restaurantId);
    await this.requireOwner(userId, restaurantId);
    const member = await this.repo.findStaffMember(restaurantId, memberId);
    if (!member) throw new AppError("NOT_FOUND", "Staff member not found");
    if (member.role === RestaurantRole.OWNER && input.role !== RestaurantRole.OWNER) {
      const owners = await this.repo.countOwners(restaurantId);
      if (owners <= 1) throw new AppError("CONFLICT", "Cannot demote the last owner");
    }
    return { member: await this.repo.updateStaffRole(restaurantId, memberId, input.role) };
  }

  async removeStaff(userId: string, restaurantId: string, memberId: string) {
    await this.requireRestaurant(restaurantId);
    await this.requireOwner(userId, restaurantId);
    const member = await this.repo.findStaffMember(restaurantId, memberId);
    if (!member) throw new AppError("NOT_FOUND", "Staff member not found");
    if (member.role === RestaurantRole.OWNER) {
      const owners = await this.repo.countOwners(restaurantId);
      if (owners <= 1) throw new AppError("CONFLICT", "Cannot remove the last owner");
    }
    await this.repo.removeStaff(restaurantId, memberId);
    return { removed: true };
  }
}
