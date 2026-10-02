import { AppError } from "../../errors/AppError.js";
import {
  CatalogConflictError,
  CatalogRecordNotFoundError,
  type CategoryWithCount,
  type ICatalogRepository,
  type MenuItemWithDetails,
} from "./catalog.repository.js";
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  ManagerMenuQuery,
  MenuItemCreateInput,
  MenuItemUpdateInput,
  PublicMenuQuery,
  RestaurantSettingsInput,
} from "./catalog.schema.js";

function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/g, "");
}

function mapCatalogError(error: unknown): never {
  if (error instanceof CatalogConflictError) {
    throw new AppError("CONFLICT", error.message);
  }
  if (error instanceof CatalogRecordNotFoundError) {
    throw new AppError("NOT_FOUND", "The requested restaurant or menu record was not found");
  }
  throw error;
}

function requireSlug(value: string): string {
  const slug = toSlug(value);
  if (!slug) {
    throw new AppError("VALIDATION_ERROR", "Names must contain at least one English letter or number");
  }
  return slug;
}

export class CatalogService {
  constructor(private readonly repo: ICatalogRepository) {}

  async publicRestaurant(slug: string) {
    const restaurant = await this.repo.findRestaurantBySlug(slug);
    if (!restaurant) throw new AppError("NOT_FOUND", "Restaurant not found");
    return restaurant;
  }

  async updateRestaurant(id: string, input: RestaurantSettingsInput) {
    try {
      return await this.repo.updateRestaurant(id, input);
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  async publicMenu(slug: string, query: PublicMenuQuery) {
    const restaurant = await this.repo.findRestaurantBySlug(slug);
    if (!restaurant) throw new AppError("NOT_FOUND", "Restaurant not found");
    const [categories, page] = await Promise.all([
      this.repo.listCategories(restaurant.id, true),
      this.repo.listPublicMenu(restaurant.id, query),
    ]);
    return {
      restaurant,
      categories,
      items: page.items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: page.total,
        pageCount: Math.ceil(page.total / query.limit),
      },
    };
  }

  async categories(restaurantId: string): Promise<CategoryWithCount[]> {
    await this.requireRestaurant(restaurantId);
    return this.repo.listCategories(restaurantId);
  }

  async createCategory(
    restaurantId: string,
    input: CategoryCreateInput,
  ): Promise<CategoryWithCount> {
    await this.requireRestaurant(restaurantId);
    try {
      return await this.repo.createCategory(restaurantId, input, requireSlug(input.name));
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    input: CategoryUpdateInput,
  ): Promise<CategoryWithCount> {
    await this.requireCategory(restaurantId, categoryId);
    try {
      return await this.repo.updateCategory(
        restaurantId,
        categoryId,
        input,
        input.name ? requireSlug(input.name) : undefined,
      );
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    await this.requireCategory(restaurantId, categoryId);
    try {
      await this.repo.deleteCategory(restaurantId, categoryId);
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  async managerMenu(restaurantId: string, query: ManagerMenuQuery) {
    await this.requireRestaurant(restaurantId);
    if (query.categoryId) await this.requireCategory(restaurantId, query.categoryId);
    const page = await this.repo.listManagerMenu(restaurantId, query);
    return {
      items: page.items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: page.total,
        pageCount: Math.ceil(page.total / query.limit),
      },
    };
  }

  async createMenuItem(
    restaurantId: string,
    input: MenuItemCreateInput,
  ): Promise<MenuItemWithDetails> {
    await this.requireActiveCategory(restaurantId, input.categoryId);
    const slug = `${requireSlug(input.name)}-${input.categoryId.slice(-6)}`.slice(0, 120);
    try {
      return await this.repo.createMenuItem(restaurantId, input, slug);
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  async updateMenuItem(
    restaurantId: string,
    menuItemId: string,
    input: MenuItemUpdateInput,
  ): Promise<MenuItemWithDetails> {
    await this.requireRestaurant(restaurantId);
    if (input.categoryId) await this.requireActiveCategory(restaurantId, input.categoryId);
    try {
      return await this.repo.updateMenuItem(restaurantId, menuItemId, input);
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  async updateAvailability(
    restaurantId: string,
    menuItemId: string,
    isAvailable: boolean,
  ): Promise<MenuItemWithDetails> {
    await this.requireRestaurant(restaurantId);
    try {
      return await this.repo.updateAvailability(restaurantId, menuItemId, isAvailable);
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  async deleteMenuItem(restaurantId: string, menuItemId: string): Promise<void> {
    await this.requireRestaurant(restaurantId);
    try {
      await this.repo.deleteMenuItem(restaurantId, menuItemId);
    } catch (error) {
      return mapCatalogError(error);
    }
  }

  private async requireRestaurant(id: string): Promise<void> {
    const restaurant = await this.repo.findRestaurantById(id);
    if (!restaurant) throw new AppError("NOT_FOUND", "Restaurant not found");
  }

  private async requireCategory(
    restaurantId: string,
    categoryId: string,
  ): Promise<CategoryWithCount> {
    const category = await this.repo.findCategory(restaurantId, categoryId);
    if (!category) throw new AppError("NOT_FOUND", "Category not found");
    return category;
  }

  private async requireActiveCategory(
    restaurantId: string,
    categoryId: string,
  ): Promise<CategoryWithCount> {
    const category = await this.requireCategory(restaurantId, categoryId);
    if (!category.isActive) {
      throw new AppError("VALIDATION_ERROR", "Choose an active category");
    }
    return category;
  }
}
