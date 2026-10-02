CREATE TYPE "MenuItemSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'SINGLE', 'DOUBLE', 'REGULAR');

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isCombo" BOOLEAN NOT NULL DEFAULT false,
    "isSpicy" BOOLEAN NOT NULL DEFAULT false,
    "prepTimeMinutes" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_item_variants" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "size" "MenuItemSize" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_restaurantId_slug_key" ON "categories"("restaurantId", "slug");
CREATE UNIQUE INDEX "categories_id_restaurantId_key" ON "categories"("id", "restaurantId");
CREATE INDEX "categories_restaurantId_isActive_sortOrder_idx" ON "categories"("restaurantId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "menu_items_restaurantId_slug_key" ON "menu_items"("restaurantId", "slug");
CREATE INDEX "menu_items_restaurantId_isAvailable_idx" ON "menu_items"("restaurantId", "isAvailable");
CREATE INDEX "menu_items_restaurantId_categoryId_isAvailable_idx" ON "menu_items"("restaurantId", "categoryId", "isAvailable");

CREATE UNIQUE INDEX "menu_item_variants_menuItemId_size_key" ON "menu_item_variants"("menuItemId", "size");
CREATE INDEX "menu_item_variants_menuItemId_isAvailable_idx" ON "menu_item_variants"("menuItemId", "isAvailable");

ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_categoryId_restaurantId_fkey"
FOREIGN KEY ("categoryId", "restaurantId") REFERENCES "categories"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_menuItemId_fkey"
FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
