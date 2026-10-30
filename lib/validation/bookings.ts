import { z } from "zod";

export const createBookingSchema = z.object({
  event_id:    z.string().uuid(),
  name:        z.string().min(2).max(200),
  phone:       z.string().max(40).optional(),
  guest_count: z.coerce.number().int().min(1).max(50),
  // One coupon per ticket; more than guest_count are allowed (the extras
  // just aren't used).
  coupon_codes: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
});

export const rejectBookingSchema = z.object({
  note: z.string().max(500).nullable().optional(),
});

export const attendanceSchema = z.object({
  attended: z.boolean(),
});
