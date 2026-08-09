import { z } from "zod";

export const featureFlagSchema = z.object({
  enabled: z.boolean(),
});
