import { z } from "zod";

export const createAdminUserSchema = z.object({
  email:   z.string().email("Email inválido."),
  name:    z.string().min(1, "Ingresá un nombre.").max(200),
  role_id: z.string().uuid("Elegí un rol."),
});

export const updateAdminUserSchema = z.object({
  name:      z.string().min(1).max(200).optional(),
  role_id:   z.string().uuid("Elegí un rol.").optional(),
  is_active: z.boolean().optional(),
});
