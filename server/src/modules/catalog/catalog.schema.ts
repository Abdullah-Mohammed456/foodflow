import { MenuItemSize } from "@prisma/client";
import { z } from "zod";

const idSchema = z.string().trim().min(1).max(64);
const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const urlSchema = z.string().trim().url().max(2048);
const priceSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/)
  .refine((value) => /[1-9]/.test(value), "Price must be greater than zero");

const variantSchema = z.object({
  size: z.nativeEnum(MenuItemSize),
  price: priceSchema,
  isAvailable: z.boolean().optional(),
}).strict();

function uniqueVariantSizes(
  value: { variants: Array<{ size: MenuItemSize }> },
  context: z.RefinementCtx,
): void {
  const sizes = value.variants.map((variant) => variant.size);
  if (new Set(sizes).size !== sizes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["variants"],
      message: "Each size can only be listed once",
    });
  }
}

export const restaurantSlugParamsSchema = z.object({ slug: slugSchema }).strict();
export const restaurantIdParamsSchema = z.object({ restaurantId: idSchema }).strict();

export const updateRestaurantSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1500).nullable().optional(),
    logoUrl: urlSchema.nullable().optional(),
    isOpen: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one restaurant setting to update",
  });

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
}).strict();

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one category field to update",
  });

export const categoryParamsSchema = z.object({
  restaurantId: idSchema,
  categoryId: idSchema,
}).strict();

const menuItemFields = {
  categoryId: idSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1500).nullable().optional(),
  imageUrl: urlSchema.nullable().optional(),
  isCombo: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  prepTimeMinutes: z.number().int().min(1).max(60),
  isAvailable: z.boolean().optional(),
  variants: z.array(variantSchema).min(1).max(6),
};

export const menuItemCreateSchema = z
  .object(menuItemFields)
  .strict()
  .superRefine(uniqueVariantSizes);

export const menuItemUpdateSchema = z
  .object({
    ...menuItemFields,
    categoryId: menuItemFields.categoryId.optional(),
    name: menuItemFields.name.optional(),
    prepTimeMinutes: menuItemFields.prepTimeMinutes.optional(),
    variants: menuItemFields.variants.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one menu item field to update",
  })
  .superRefine((value, context) => {
    if (value.variants) uniqueVariantSizes(value as { variants: Array<{ size: MenuItemSize }> }, context);
  });

export const menuItemParamsSchema = z.object({
  restaurantId: idSchema,
  menuItemId: idSchema,
}).strict();

export const availabilitySchema = z.object({ isAvailable: z.boolean() }).strict();

export const publicMenuQuerySchema = z.object({
  category: slugSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
}).strict();

export const managerMenuQuerySchema = z.object({
  categoryId: idSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  isAvailable: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
}).strict();

export type RestaurantSettingsInput = z.infer<typeof updateRestaurantSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;
export type PublicMenuQuery = z.infer<typeof publicMenuQuerySchema>;
export type ManagerMenuQuery = z.infer<typeof managerMenuQuerySchema>;
