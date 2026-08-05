import { z } from "zod";

export const createBookingSchema = z.object({
  event_id:    z.string().uuid(),
  name:        z.string().min(2).max(200),
  email:       z.string().email(),
  phone:       z.string().max(40).optional(),
  guest_count: z.coerce.number().int().min(1).max(50),
});

export const rejectBookingSchema = z.object({
  note: z.string().max(500).nullable().optional(),
});

export const attendanceSchema = z.object({
  attended: z.boolean(),
});
