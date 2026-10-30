import { test } from "node:test";
import assert from "node:assert/strict";
import { priceWithCoupons } from "./coupons";

const c = (code: string, discountPercent: number) => ({ code, discountPercent });

test("no coupons: full price", () => {
  const p = priceWithCoupons(8000, 3, []);
  assert.deepEqual([p.subtotal, p.discount, p.cost], [24000, 0, 24000]);
});

test("one coupon discounts one ticket only", () => {
  const p = priceWithCoupons(8000, 3, [c("A", 15)]);
  assert.equal(p.discount, 1200);
  assert.equal(p.cost, 22800);
  assert.deepEqual(p.used.map((x) => x.code), ["A"]);
});

test("one coupon per person", () => {
  const p = priceWithCoupons(8000, 2, [c("A", 15), c("B", 50)]);
  assert.equal(p.discount, 1200 + 4000);
  assert.equal(p.unused.length, 0);
});

test("more coupons than people: biggest discounts used, rest returned", () => {
  const p = priceWithCoupons(8000, 2, [c("A", 10), c("B", 50), c("C", 20)]);
  assert.deepEqual(p.used.map((x) => x.code), ["B", "C"]);
  assert.deepEqual(p.unused.map((x) => x.code), ["A"]);
  assert.equal(p.cost, 16000 - 4000 - 1600);
});

test("ties keep entry order", () => {
  const p = priceWithCoupons(8000, 1, [c("A", 15), c("B", 15)]);
  assert.deepEqual(p.used.map((x) => x.code), ["A"]);
  assert.deepEqual(p.unused.map((x) => x.code), ["B"]);
});

test("100% coupon makes that ticket free", () => {
  const p = priceWithCoupons(8000, 1, [c("A", 100)]);
  assert.equal(p.cost, 0);
});
