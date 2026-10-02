import "dotenv/config";
import { MenuItemSize, Prisma, PrismaClient, RestaurantRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { z } from "zod";

const databaseUrl = z.string().min(1).parse(process.env["DATABASE_URL"]);
const ownerEmail = process.env["SEED_OWNER_EMAIL"]?.trim().toLowerCase();
if (ownerEmail) z.string().email().parse(ownerEmail);

const pool = new pg.Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const categories = [
  { name: "Pizza", slug: "pizza", sortOrder: 1 },
  { name: "Burgers", slug: "burgers", sortOrder: 2 },
  { name: "Sandwiches", slug: "sandwiches", sortOrder: 3 },
  { name: "Fries & Sides", slug: "fries-sides", sortOrder: 4 },
  { name: "Chicken", slug: "chicken", sortOrder: 5 },
  { name: "Drinks", slug: "drinks", sortOrder: 6 },
  { name: "Desserts", slug: "desserts", sortOrder: 7 },
  { name: "Combos & Deals", slug: "combos-deals", sortOrder: 8 },
] as const;

const menu = [
  {
    name: "Margherita Pizza",
    slug: "margherita-pizza",
    categorySlug: "pizza",
    description: "Tomato, mozzarella, and fresh basil.",
    prepTimeMinutes: 12,
    isSpicy: false,
    variants: [
      { size: MenuItemSize.MEDIUM, price: "145.00" },
      { size: MenuItemSize.LARGE, price: "195.00" },
    ],
  },
  {
    name: "Pepperoni Pizza",
    slug: "pepperoni-pizza",
    categorySlug: "pizza",
    description: "Mozzarella and crispy beef pepperoni.",
    prepTimeMinutes: 13,
    isSpicy: false,
    variants: [
      { size: MenuItemSize.MEDIUM, price: "175.00" },
      { size: MenuItemSize.LARGE, price: "230.00" },
    ],
  },
  {
    name: "Classic Cheeseburger",
    slug: "classic-cheeseburger",
    categorySlug: "burgers",
    description: "Beef patty, cheddar, lettuce, and house sauce.",
    prepTimeMinutes: 8,
    isSpicy: false,
    variants: [
      { size: MenuItemSize.SINGLE, price: "115.00" },
      { size: MenuItemSize.DOUBLE, price: "155.00" },
    ],
  },
  {
    name: "Double Smash Burger",
    slug: "double-smash-burger",
    categorySlug: "burgers",
    description: "Two seared beef patties with pickles and cheese.",
    prepTimeMinutes: 9,
    isSpicy: false,
    variants: [{ size: MenuItemSize.DOUBLE, price: "175.00" }],
  },
  {
    name: "Crispy Chicken Sandwich",
    slug: "crispy-chicken-sandwich",
    categorySlug: "sandwiches",
    description: "Crispy chicken, slaw, and creamy sauce.",
    prepTimeMinutes: 9,
    isSpicy: false,
    variants: [{ size: MenuItemSize.REGULAR, price: "135.00" }],
  },
  {
    name: "Club Sandwich",
    slug: "club-sandwich",
    categorySlug: "sandwiches",
    description: "Grilled chicken, cheese, lettuce, and tomato.",
    prepTimeMinutes: 10,
    isSpicy: false,
    variants: [{ size: MenuItemSize.REGULAR, price: "125.00" }],
  },
  {
    name: "French Fries",
    slug: "french-fries",
    categorySlug: "fries-sides",
    description: "Golden, lightly salted fries.",
    prepTimeMinutes: 5,
    isSpicy: false,
    variants: [
      { size: MenuItemSize.REGULAR, price: "45.00" },
      { size: MenuItemSize.LARGE, price: "65.00" },
    ],
  },
  {
    name: "Loaded Fries",
    slug: "loaded-fries",
    categorySlug: "fries-sides",
    description: "Fries topped with cheese sauce and herbs.",
    prepTimeMinutes: 7,
    isSpicy: false,
    variants: [{ size: MenuItemSize.REGULAR, price: "85.00" }],
  },
  {
    name: "Chicken Nuggets",
    slug: "chicken-nuggets",
    categorySlug: "chicken",
    description: "Crispy chicken bites with dipping sauce.",
    prepTimeMinutes: 7,
    isSpicy: false,
    variants: [
      { size: MenuItemSize.SINGLE, price: "90.00" },
      { size: MenuItemSize.DOUBLE, price: "160.00" },
    ],
  },
  {
    name: "Cola",
    slug: "cola",
    categorySlug: "drinks",
    description: "Chilled sparkling cola.",
    prepTimeMinutes: 1,
    isSpicy: false,
    variants: [
      { size: MenuItemSize.REGULAR, price: "30.00" },
      { size: MenuItemSize.LARGE, price: "40.00" },
    ],
  },
  {
    name: "Milkshake",
    slug: "milkshake",
    categorySlug: "drinks",
    description: "Vanilla milkshake blended to order.",
    prepTimeMinutes: 4,
    isSpicy: false,
    variants: [{ size: MenuItemSize.REGULAR, price: "80.00" }],
  },
  {
    name: "Chocolate Cake",
    slug: "chocolate-cake",
    categorySlug: "desserts",
    description: "Rich chocolate cake slice.",
    prepTimeMinutes: 2,
    isSpicy: false,
    variants: [{ size: MenuItemSize.REGULAR, price: "75.00" }],
  },
  {
    name: "Burger + Fries + Drink Combo",
    slug: "burger-fries-drink-combo",
    categorySlug: "combos-deals",
    description:
      "A cheeseburger, fries, and a regular drink at one bundle price.",
    prepTimeMinutes: 10,
    isSpicy: false,
    isCombo: true,
    variants: [{ size: MenuItemSize.REGULAR, price: "225.00" }],
  },
] as const;

async function seed(): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const restaurant = await tx.restaurant.upsert({
      where: { slug: "foodflow" },
      create: {
        name: "FoodFlow",
        slug: "foodflow",
        description: "Fast food, made fresh and served fast.",
      },
      update: {},
    });

    const categoryIds = new Map<string, string>();
    for (const category of categories) {
      const saved = await tx.category.upsert({
        where: {
          restaurantId_slug: {
            restaurantId: restaurant.id,
            slug: category.slug,
          },
        },
        create: { ...category, restaurantId: restaurant.id },
        update: {},
        select: { id: true },
      });
      categoryIds.set(category.slug, saved.id);
    }

    for (const item of menu) {
      const categoryId = categoryIds.get(item.categorySlug);
      if (!categoryId)
        throw new Error(`Seed category is missing for ${item.slug}`);
      await tx.menuItem.upsert({
        where: {
          restaurantId_slug: { restaurantId: restaurant.id, slug: item.slug },
        },
        create: {
          restaurantId: restaurant.id,
          categoryId,
          name: item.name,
          slug: item.slug,
          description: item.description,
          prepTimeMinutes: item.prepTimeMinutes,
          isSpicy: item.isSpicy,
          isCombo: "isCombo" in item ? item.isCombo : false,
          variants: {
            create: item.variants.map((variant) => ({ ...variant })),
          },
        },
        update: {},
      });
    }

    if (ownerEmail) {
      const user = await tx.user.findUnique({
        where: { email: ownerEmail },
        select: { id: true },
      });
      if (!user)
        throw new Error("SEED_OWNER_EMAIL must belong to a registered user");
      await tx.restaurantMember.upsert({
        where: {
          userId_restaurantId: { userId: user.id, restaurantId: restaurant.id },
        },
        create: {
          userId: user.id,
          restaurantId: restaurant.id,
          role: RestaurantRole.OWNER,
        },
        update: { role: RestaurantRole.OWNER },
      });
    }
  });
  process.stdout.write("FoodFlow catalog seed completed\n");
}

seed()
  .catch((error: unknown) => {
    process.stderr.write(
      `FoodFlow catalog seed failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
