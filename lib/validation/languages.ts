import { z } from "zod";

export const languageSchema = z.object({
  code: z.string().trim().min(1, "Falta el código.").max(5, "El código puede tener hasta 5 letras.")
    .transform((c) => c.toUpperCase()),
  name: z.string().trim().min(1, "Falta el nombre.").max(50),
});
