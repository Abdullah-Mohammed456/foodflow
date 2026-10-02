ALTER TABLE "orders"
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "checkoutKey" TEXT,
ADD COLUMN "requestHash" TEXT;

UPDATE "orders" SET "checkoutKey" = 'legacy:' || "id", "requestHash" = 'legacy';
ALTER TABLE "orders" ALTER COLUMN "checkoutKey" SET NOT NULL, ALTER COLUMN "requestHash" SET NOT NULL;
CREATE UNIQUE INDEX "orders_customerId_checkoutKey_key" ON "orders"("customerId", "checkoutKey");

ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_check" CHECK (
    "subtotal" >= 0 AND "deliveryFee" >= 0 AND "discount" >= 0
    AND "discount" <= "subtotal" + "deliveryFee"
    AND "total" = "subtotal" + "deliveryFee" - "discount"
);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_amounts_check" CHECK (
    "quantity" > 0 AND "unitPrice" > 0 AND "lineTotal" = "unitPrice" * "quantity"
);
