import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { checkoutAttempt, forgetCheckoutAttempt, reviewCart, loadCheckoutMenu } from "../lib/checkout";
import type { CartLine, MenuItem } from "../lib/foodflow";

const saved = new Map<string, string>();
beforeEach(() => {
  saved.clear();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } });
});
const line: CartLine = { menuItemId: "burger", name: "Burger", image: "/food/burger.jpg", size: "REGULAR", unitPrice: "100.00", quantity: 2 };
const item = { id: "burger", isAvailable: true, category: { isActive: true }, variants: [{ size: "REGULAR", price: "100.00", isAvailable: true }] } as MenuItem;

test("current menu detects changed prices and unavailable sizes", () => {
  assert.equal(reviewCart([line], [item])[0]!.changed, false);
  assert.equal(reviewCart([line], [{ ...item, variants: [{ ...item.variants[0]!, price: "120.00" }] }])[0]!.changed, true);
  assert.equal(reviewCart([line], [{ ...item, variants: [] }])[0]!.available, false);
  assert.equal(reviewCart([line], [{ ...item, category: { ...item.category, isActive: false } }])[0]!.available, false);
  assert.equal(reviewCart([line], [])[0]!.available, false);
});
test("a retry and page reload reuse the same order key", async () => {
  const payload = { items: [{ id: "burger", quantity: 2 }] };
  const first = await checkoutAttempt("customer", payload, null);
  assert.deepEqual(await checkoutAttempt("customer", payload, first), first);
  assert.deepEqual(await checkoutAttempt("customer", payload, null), first);
});
test("changed order details and another customer get new keys", async () => {
  const first = await checkoutAttempt("customer", { address: "Street A" }, null);
  const changed = await checkoutAttempt("customer", { address: "Street B" }, first);
  assert.notEqual(first.key, changed.key);
  assert.notEqual(changed.key, (await checkoutAttempt("other", { address: "Street B" }, changed)).key);
  assert.ok(!JSON.stringify([...saved.values()]).includes("Street"));
});
test("blocked storage still allows retries and cleanup", async () => {
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get() { throw new Error("Blocked"); } });
  const first = await checkoutAttempt("customer", { quantity: 1 }, null);
  assert.deepEqual(await checkoutAttempt("customer", { quantity: 1 }, first), first);
  assert.doesNotThrow(forgetCheckoutAttempt);
});
test("malformed saved keys are ignored and successful orders clear the key", async () => {
  saved.set("foodflow-checkout-attempt", "broken JSON");
  const attempt = await checkoutAttempt("customer", {}, null);
  assert.match(attempt.key, /^[0-9a-f-]{36}$/);
  forgetCheckoutAttempt();
  assert.equal(saved.size, 0);
});

test("checkout uses active categories from the API category list and fetches every page", async () => {
  const originalFetch = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    const path = String(input);
    paths.push(path);
    const page = path.includes("page=2") ? 2 : 1;
    return new Response(JSON.stringify({ success: true, data: {
      items: [{ ...item, id: page === 1 ? "burger" : "fries", category: { id: "meals", name: "Meals", slug: "meals" } }],
      categories: [{ id: "meals", isActive: true }],
      pagination: { page, pageCount: 2 },
    } }), { headers: { "content-type": "application/json" } });
  };
  try {
    const menu = await loadCheckoutMenu();
    assert.equal(paths.length, 2);
    assert.equal(menu.length, 2);
    assert.equal(reviewCart([line], menu)[0]!.available, true);
  } finally { globalThis.fetch = originalFetch; }
});
