import { test } from "node:test";
import assert from "node:assert/strict";
import { priceBooking, type BookingPriceInput } from "./bookingPricing";

const base: BookingPriceInput = {
  pricePerPerson: 8000, guestCount: 1, codes: [], memberDiscountPercent: 0, freeTickets: 0, useTwoForOne: false,
};

test("member discount applies to one ticket only", () => {
  const p = priceBooking({ ...base, guestCount: 3, memberDiscountPercent: 10 });
  assert.equal(p.cost, 24000 - 800);
  assert.equal(p.memberUsed, true);
});

test("2x1 makes one ticket free, only with 2+ people", () => {
  assert.equal(priceBooking({ ...base, guestCount: 2, useTwoForOne: true }).cost, 8000);
  const solo = priceBooking({ ...base, guestCount: 1, useTwoForOne: true });
  assert.equal(solo.cost, 8000);
  assert.equal(solo.twoForOneUsed, false);
});

test("free tickets beyond the number of people aren't consumed", () => {
  const p = priceBooking({ ...base, guestCount: 2, freeTickets: 3 });
  assert.equal(p.cost, 0);
  assert.equal(p.freeTicketsUsed, 2);
});

test("discounts don't stack on the same ticket: the biggest ones take the tickets", () => {
  // 1 person, a 50% coupon and a 10% member discount: only the coupon applies.
  const p = priceBooking({ ...base, codes: [{ code: "HALF", discountPercent: 50, source: "coupon" }], memberDiscountPercent: 10 });
  assert.equal(p.cost, 4000);
  assert.equal(p.memberUsed, false);
});

test("2 people: invite for the friend, member discount for the booker", () => {
  const p = priceBooking({ ...base, guestCount: 2, codes: [{ code: "INV-X", discountPercent: 100, source: "invite" }], memberDiscountPercent: 10 });
  assert.equal(p.cost, 8000 - 800);
  assert.deepEqual(p.used.map((s) => s.source).sort(), ["invite", "member"]);
});

test("2x1 left unused when free tickets already cover both", () => {
  const p = priceBooking({ ...base, guestCount: 2, freeTickets: 2, useTwoForOne: true });
  assert.equal(p.cost, 0);
  assert.equal(p.twoForOneUsed, false);
  assert.equal(p.freeTicketsUsed, 2);
});
