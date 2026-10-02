import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminRangeQuerySchema,
  popularItemsQuerySchema,
  revenueQuerySchema,
  rushQuerySchema,
  staffCreateSchema,
  staffUpdateSchema,
} from "../src/modules/admin/admin.schema.js";

test("admin range rejects inverted dates and accepts empty range", () => {
  assert.equal(adminRangeQuerySchema.safeParse({}).success, true);
  assert.equal(
    adminRangeQuerySchema.safeParse({ from: "2026-10-01T00:00:00.000Z", to: "2026-10-02T00:00:00.000Z" }).success,
    true,
  );
  assert.equal(adminRangeQuerySchema.safeParse({ from: "not-a-date" }).success, false);
  assert.equal(adminRangeQuerySchema.safeParse({ from: "2026-10-01" }).success, false);
});

test("revenue granularity defaults to day and rejects unknown values", () => {
  assert.deepEqual(revenueQuerySchema.parse({}), { granularity: "day" });
  assert.equal(revenueQuerySchema.safeParse({ granularity: "week" }).success, false);
  assert.equal(revenueQuerySchema.safeParse({ granularity: "hour" }).success, true);
});

test("popular items bounds limit and rush bounds days", () => {
  assert.deepEqual(popularItemsQuerySchema.parse({}), { limit: 10 });
  assert.equal(popularItemsQuerySchema.safeParse({ limit: 0 }).success, false);
  assert.equal(popularItemsQuerySchema.safeParse({ limit: 51 }).success, false);
  assert.deepEqual(rushQuerySchema.parse({}), { days: 7 });
  assert.equal(rushQuerySchema.safeParse({ days: 0 }).success, false);
  assert.equal(rushQuerySchema.safeParse({ days: 31 }).success, false);
});

test("staff roles reject unknown roles and bad emails", () => {
  assert.equal(staffCreateSchema.safeParse({ email: "cook@example.test", role: "KITCHEN" }).success, true);
  assert.equal(staffCreateSchema.safeParse({ email: "cook@example.test", role: "CUSTOMER" }).success, false);
  assert.equal(staffCreateSchema.safeParse({ email: "not-an-email", role: "KITCHEN" }).success, false);
  assert.equal(staffUpdateSchema.safeParse({ role: "OWNER" }).success, true);
  assert.equal(staffUpdateSchema.safeParse({}).success, false);
  assert.equal(staffUpdateSchema.safeParse({ role: "ADMIN" }).success, false);
});
