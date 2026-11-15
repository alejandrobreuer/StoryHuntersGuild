import { z } from "zod";

export const createBookingSchema = z.object({
  event_id:    z.string().uuid(),
  name:        z.string().min(2).max(200),
  phone:       z.string().max(40).optional(),
  guest_count: z.coerce.number().int().min(1).max(50),
  // One coupon (or invite code) per ticket; more than guest_count are
  // allowed (the extras just aren't used).
  coupon_codes: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
  // Benefits the booker chose to spend on this booking (lib/benefits.ts).
  use_2x1:      z.boolean().default(false),
  free_tickets: z.coerce.number().int().min(0).max(50).default(0),
});

export const rejectBookingSchema = z.object({
  note: z.string().max(500).nullable().optional(),
});

export const attendanceSchema = z.object({
  attended: z.boolean(),
});
