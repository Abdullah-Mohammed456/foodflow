import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  ManagerMenuQuery,
  MenuItemCreateInput,
  MenuItemUpdateInput,
  PublicMenuQuery,
  RestaurantSettingsInput,
} from "./catalog.schema.js";

const categoryCount = {
  _count: { select: { menuItems: true } },
} satisfies Prisma.CategoryInclude;

const menuItemDetails = {
  category: { select: { id: true, name: true, slug: true } },
  variants: { orderBy: { size: "asc" } },
} satisfies Prisma.MenuItemInclude;

export type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: typeof categoryCount;
}>;

export type MenuItemWithDetails = Prisma.MenuItemGetPayload<{
  include: typeof menuItemDetails;
}>;

export type RestaurantPublicDetails = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isOpen: boolean;
};

export interface ICatalogRepository {
  findRestaurantBySlug(slug: string): Promise<RestaurantPublicDetails | null>;
  findRestaurantById(id: string): Promise<RestaurantPublicDetails | null>;
  updateRestaurant(id: string, input: RestaurantSettingsInput): Promise<RestaurantPublicDetails>;
  listCategories(restaurantId: string, activeOnly?: boolean): Promise<CategoryWithCount[]>;
  findCategory(restaurantId: string, categoryId: string): Promise<CategoryWithCount | null>;
  createCategory(restaurantId: string, input: CategoryCreateInput, slug: string): Promise<CategoryWithCount>;
  updateCategory(restaurantId: string, categoryId: string, input: CategoryUpdateInput, slug?: string): Promise<CategoryWithCount>;
  deleteCategory(restaurantId: string, categoryId: string): Promise<void>;
  listPublicMenu(restaurantId: string, query: PublicMenuQuery): Promise<{ items: MenuItemWithDetails[]; total: number }>;
  listManagerMenu(restaurantId: string, query: ManagerMenuQuery): Promise<{ items: MenuItemWithDetails[]; total: number }>;
  createMenuItem(restaurantId: string, input: MenuItemCreateInput, slug: string): Promise<MenuItemWithDetails>;
  updateMenuItem(restaurantId: string, menuItemId: string, input: MenuItemUpdateInput): Promise<MenuItemWithDetails>;
  updateAvailability(restaurantId: string, menuItemId: string, isAvailable: boolean): Promise<MenuItemWithDetails>;
  deleteMenuItem(restaurantId: string, menuItemId: string): Promise<void>;
}

export class CatalogConflictError extends Error {
  constructor(message = "Catalog record conflicts with existing data") {
    super(message);
    this.name = "CatalogConflictError";
  }
}

export class CatalogRecordNotFoundError extends Error {
  constructor() {
    super("Catalog record not found");
    this.name = "CatalogRecordNotFoundError";
  }
}

function translatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new CatalogConflictError("A record with these details already exists");
    }
    if (error.code === "P2003" || error.code === "P2014") {
      throw new CatalogConflictError("This record is still in use");
    }
    if (error.code === "P2025") {
      throw new CatalogRecordNotFoundError();
    }
  }
  throw error;
}

export class PrismaCatalogRepository implements ICatalogRepository {
  constructor(private readonly db: PrismaClient) {}

  findRestaurantBySlug(slug: string): Promise<RestaurantPublicDetails | null> {
    return this.db.restaurant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, description: true, logoUrl: true, isOpen: true },
    });
  }

  findRestaurantById(id: string): Promise<RestaurantPublicDetails | null> {
    return this.db.restaurant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, description: true, logoUrl: true, isOpen: true },
    });
  }

  async updateRestaurant(
    id: string,
    input: RestaurantSettingsInput,
  ): Promise<RestaurantPublicDetails> {
    try {
      return await this.db.restaurant.update({
        where: { id },
        data: input,
        select: { id: true, name: true, slug: true, description: true, logoUrl: true, isOpen: true },
      });
    } catch (error) {
      return translatePrismaError(error);
    }
  }

  listCategories(restaurantId: string, activeOnly = false): Promise<CategoryWithCount[]> {
    return this.db.category.findMany({
      where: { restaurantId, ...(activeOnly ? { isActive: true } : {}) },
      include: categoryCount,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findCategory(restaurantId: string, categoryId: string): Promise<CategoryWithCount | null> {
    return this.db.category.findFirst({
      where: { id: categoryId, restaurantId },
      include: categoryCount,
    });
  }

  async createCategory(
    restaurantId: string,
    input: CategoryCreateInput,
    slug: string,
  ): Promise<CategoryWithCount> {
    try {
      return await this.db.category.create({
        data: { ...input, slug, restaurantId },
        include: categoryCount,
      });
    } catch (error) {
      return translatePrismaError(error);
    }
  }

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    input: CategoryUpdateInput,
    slug?: string,
  ): Promise<CategoryWithCount> {
    try {
      return await this.db.category.update({
        where: { id: categoryId, restaurantId },
        data: { ...input, ...(slug ? { slug } : {}) },
        include: categoryCount,
      });
    } catch (error) {
      return translatePrismaError(error);
    }
  }

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    try {
      await this.db.category.delete({ where: { id: categoryId, restaurantId } });
    } catch (error) {
      return translatePrismaError(error);
    }
  }

  async listPublicMenu(
    restaurantId: string,
    query: PublicMenuQuery,
  ): Promise<{ items: MenuItemWithDetails[]; total: number }> {
    const where: Prisma.MenuItemWhereInput = {
      restaurantId,
      isAvailable: true,
      category: { isActive: true, ...(query.category ? { slug: query.category } : {}) },
      variants: { some: { isAvailable: true } },
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.db.$transaction([
      this.db.menuItem.count({ where }),
      this.db.menuItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isAvailable: true },
            orderBy: { size: "asc" },
          },
        },
        orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return { items, total };
  }

  async listManagerMenu(
    restaurantId: string,
    query: ManagerMenuQuery,
  ): Promise<{ items: MenuItemWithDetails[]; total: number }> {
    const where: Prisma.MenuItemWhereInput = {
      restaurantId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isAvailable !== undefined ? { isAvailable: query.isAvailable } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.db.$transaction([
      this.db.menuItem.count({ where }),
      this.db.menuItem.findMany({
        where,
        include: menuItemDetails,
        orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return { items, total };
  }

  async createMenuItem(
    restaurantId: string,
    input: MenuItemCreateInput,
    slug: string,
  ): Promise<MenuItemWithDetails> {
    const { variants, ...fields } = input;
    try {
      return await this.db.menuItem.create({
        data: {
          ...fields,
          slug,
          restaurantId,
          variants: {
            create: variants.map((variant) => ({
              ...variant,
              isAvailable: variant.isAvailable ?? true,
            })),
          },
        },
        include: menuItemDetails,
      });
    } catch (error) {
      return translatePrismaError(error);
    }
  }

  async updateMenuItem(
    restaurantId: string,
    menuItemId: string,
    input: MenuItemUpdateInput,
  ): Promise<MenuItemWithDetails> {
    const { variants, ...fields } = input;
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.menuItem.update({
          where: { id: menuItemId, restaurantId },
          data: fields,
        });
        if (variants) {
          await tx.menuItemVariant.deleteMany({
            where: { menuItemId, size: { notIn: variants.map((variant) => variant.size) } },
          });
          for (const variant of variants) {
            await tx.menuItemVariant.upsert({
              where: { menuItemId_size: { menuItemId, size: variant.size } },
              create: {
                menuItemId,
                ...variant,
                isAvailable: variant.isAvailable ?? true,
              },
              update: {
                price: variant.price,
                ...(variant.isAvailable !== undefined ? { isAvailable: variant.isAvailable } : {}),
              },
            });
          }
        }
        return tx.menuItem.findUniqueOrThrow({
          where: { id: menuItemId },
          include: menuItemDetails,
        });
      });
    } catch (error) {
      return translatePrismaError(error);
    }
  }

  async updateAvailability(
    restaurantId: string,
    menuItemId: string,
    isAvailable: boolean,
  ): Promise<MenuItemWithDetails> {
    try {
      return await this.db.menuItem.update({
        where: { id: menuItemId, restaurantId },
        data: { isAvailable },
        include: menuItemDetails,
      });
    } catch (error) {
      return translatePrismaError(error);
    }
  }

  async deleteMenuItem(restaurantId: string, menuItemId: string): Promise<void> {
    try {
      await this.db.menuItem.delete({ where: { id: menuItemId, restaurantId } });
    } catch (error) {
      return translatePrismaError(error);
    }
  }
}
