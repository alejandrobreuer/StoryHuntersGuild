import { z } from "zod";

export const tagSchema = z.object({
  name: z.string().min(1).max(40),
});
