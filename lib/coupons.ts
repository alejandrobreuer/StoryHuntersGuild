// ─── Coupon pricing ─────────────────────────────────────────────────────────
// Each coupon discounts ONE ticket. A booking for N people can use up to N
// coupons; any extra stay unused (and stay redeemable). When there are more
// coupons than people, the biggest discounts are the ones used. Shared by the
// booking form (live total) and POST /api/bookings (the price charged).

export interface CouponForPricing {
  code:            string;
  discountPercent: number;
}

export interface CouponPricing<C extends CouponForPricing> {
  used:     C[];
  unused:   C[];
  subtotal: number;
  discount: number;
  cost:     number;
}

export function priceWithCoupons<C extends CouponForPricing>(
  pricePerPerson: number,
  guestCount: number,
  coupons: C[],
): CouponPricing<C> {
  // Stable sort: equal discounts keep the order they were entered in.
  const ranked = [...coupons].sort((a, b) => b.discountPercent - a.discountPercent);
  const used = ranked.slice(0, Math.max(0, guestCount));
  const usedSet = new Set(used);
  const unused = coupons.filter((c) => !usedSet.has(c));
  const subtotal = pricePerPerson * guestCount;
  const discount = used.reduce((sum, c) => sum + Math.round(pricePerPerson * (c.discountPercent / 100)), 0);
  return { used, unused, subtotal, discount, cost: subtotal - discount };
}
