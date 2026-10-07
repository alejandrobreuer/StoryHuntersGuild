import { z } from "zod";

// Granted to an existing shg_users account — no password typed here, the
// admin authenticates with that account's own password from then on (see
// 045_shg_admin_user_link.sql / app/api/auth/admin-sign-in/route.ts).
export const createAdminUserSchema = z.object({
  user_id: z.string().uuid("Elegí un usuario."),
  role_id: z.string().uuid("Elegí un rol."),
});

export const updateAdminUserSchema = z.object({
  name:          z.string().min(1).max(200).optional(),
  role_id:       z.string().uuid("Elegí un rol.").optional(),
  is_active:     z.boolean().optional(),
  // Only meaningful for an admin-only account (user_id null) — a linked
  // account's password lives on its shg_users row instead; the route
  // rejects this field for those.
  resetPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100).optional(),
});
