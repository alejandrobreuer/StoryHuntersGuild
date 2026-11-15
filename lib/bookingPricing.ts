import { priceWithCoupons, type CouponForPricing } from "@/lib/coupons";

// ─── Booking price with coupons and benefits ────────────────────────────────
// Everything that lowers a booking's price is a per-ticket discount, so it all
// goes through priceWithCoupons: the biggest discounts take the N tickets and
// the rest are left unused (and not consumed). Shared by the booking form
// (live total) and POST /api/bookings (the price charged).
//
//   coupon / invite   one ticket each, their percent
//   member            the booker's own ticket, their best permanent discount
//   free              one ticket each, 100% (free_tickets benefit)
//   twoForOne         one ticket, 100%, only with 2+ people (monthly_2x1)

export type DiscountSource = "coupon" | "invite" | "member" | "free" | "twoForOne";

export interface DiscountSlot extends CouponForPricing {
  source: DiscountSource;
  label:  string;
}

export interface BookingPriceInput {
  pricePerPerson: number;
  guestCount:     number;
  /** Coupons and invite codes the booker entered. */
  codes:          { code: string; discountPercent: number; source: "coupon" | "invite" }[];
  memberDiscountPercent: number;
  freeTickets:    number;
  useTwoForOne:   boolean;
}

export function priceBooking(input: BookingPriceInput) {
  const slots: DiscountSlot[] = input.codes.map((c) => ({
    ...c, label: c.source === "invite" ? `Invitación ${c.code}` : `Cupón ${c.code}`,
  }));
  for (let i = 0; i < input.freeTickets; i++) {
    slots.push({ code: `FREE-${i + 1}`, discountPercent: 100, source: "free", label: "Entrada gratis" });
  }
  if (input.useTwoForOne && input.guestCount >= 2) {
    slots.push({ code: "2X1", discountPercent: 100, source: "twoForOne", label: "2x1" });
  }
  if (input.memberDiscountPercent > 0) {
    slots.push({ code: "MEMBER", discountPercent: input.memberDiscountPercent, source: "member", label: `Beneficio de miembro ${input.memberDiscountPercent}%` });
  }
  const result = priceWithCoupons(input.pricePerPerson, input.guestCount, slots);
  const count = (source: DiscountSource) => result.used.filter((s) => s.source === source).length;
  return {
    ...result,
    freeTicketsUsed: count("free"),
    twoForOneUsed:   count("twoForOne") > 0,
    memberUsed:      count("member") > 0,
  };
}
