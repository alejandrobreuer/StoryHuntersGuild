import { z } from "zod";

export const gameOwnerSchema = z.object({
  name: z.string().min(1).max(100),
});
