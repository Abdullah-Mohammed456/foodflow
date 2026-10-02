ALTER TABLE "orders" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "prepDueAt" TIMESTAMP(3);
UPDATE "orders" SET "prepDueAt" = "createdAt" + INTERVAL '15 minutes';
ALTER TABLE "orders" ALTER COLUMN "prepDueAt" SET NOT NULL;
ALTER TABLE "order_items" ADD COLUMN "prepTimeMinutesSnapshot" INTEGER NOT NULL DEFAULT 15;
CREATE INDEX "orders_restaurantId_status_prepDueAt_idx" ON "orders"("restaurantId", "status", "prepDueAt");
ALTER TABLE "orders" ADD CONSTRAINT "orders_revision_check" CHECK ("revision" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_prep_time_check" CHECK ("prepTimeMinutesSnapshot" > 0);
