import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z.string().email("Email inválido."),
});
