import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createOrderSchema, orderQuerySchema } from "../src/modules/orders/order.schema.js";

const cart = {
  restaurantId: "branch", checkoutKey: randomUUID(), orderType: "TAKEAWAY",
  items: [{ menuItemId: "burger", size: "SINGLE", quantity: 2 }],
};

test("checkout rejects client prices, ownership and arbitrary status", () => {
  for (const field of ["total", "subtotal", "deliveryFee", "discount", "customerId", "status"]) {
    assert.equal(createOrderSchema.safeParse({ ...cart, [field]: 1 }).success, false);
  }
  assert.equal(createOrderSchema.safeParse({ ...cart, items: [{ ...cart.items[0], price: "0.01" }] }).success, false);
});

test("checkout bounds quantities and cart size and requires valid sizes and keys", () => {
  for (const quantity of [0, -1, 1.5, 21, "1"]) {
    assert.equal(createOrderSchema.safeParse({ ...cart, items: [{ ...cart.items[0], quantity }] }).success, false);
  }
  assert.equal(createOrderSchema.safeParse({ ...cart, items: [] }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...cart, items: Array.from({ length: 51 }, (_, i) => ({ menuItemId: `item-${i}`, size: "REGULAR", quantity: 1 })) }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...cart, checkoutKey: "bad" }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...cart, items: [{ ...cart.items[0], size: "HUGE" }] }).success, false);
  assert.equal(createOrderSchema.safeParse(cart).success, true);
});

test("duplicate item sizes are rejected but different sizes are allowed", () => {
  assert.equal(createOrderSchema.safeParse({ ...cart, items: [cart.items[0], cart.items[0]] }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...cart, items: [cart.items[0], { ...cart.items[0], size: "DOUBLE" }] }).success, true);
});

test("delivery needs an address and other order types reject it", () => {
  assert.equal(createOrderSchema.safeParse({ ...cart, orderType: "DELIVERY" }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...cart, orderType: "DELIVERY", deliveryAddress: "12 Cairo Street" }).success, true);
  assert.equal(createOrderSchema.safeParse({ ...cart, deliveryAddress: "12 Cairo Street" }).success, false);
});

test("history defaults and pagination limits are validated", () => {
  assert.deepEqual(orderQuerySchema.parse({}), { page: 1, limit: 20 });
  assert.equal(orderQuerySchema.safeParse({ page: 0 }).success, false);
  assert.equal(orderQuerySchema.safeParse({ limit: 101 }).success, false);
  assert.equal(orderQuerySchema.safeParse({ customerId: "other" }).success, false);
});
