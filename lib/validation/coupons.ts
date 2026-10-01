import { z } from "zod";

// Admin create — codes are normalized to uppercase so they read consistently
// in the admin list; matching against them is case-insensitive regardless
// (see the shg_coupons_code_upper_idx unique index).
export const couponSchema = z.object({
  code:             z.string().trim().min(3, "Mínimo 3 caracteres.").max(40).transform((s) => s.toUpperCase()),
  discount_percent: z.number().int().min(1).max(100),
});

// Public "apply this code" check — a plain string, matched case-insensitively
// server-side, so this schema doesn't need to normalize anything itself.
export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, "Ingresá un código.").max(40),
});
