import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z.string().email("Email inválido."),
});

export const signUpSchema = z.object({
  email:    z.string().email("Email inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100),
  name:     z.string().max(200).nullable().optional(),
});

export const signInSchema = z.object({
  email:    z.string().email("Email inválido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export const setPasswordSchema = z.object({
  newPassword:     z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100),
  currentPassword: z.string().min(1).optional(),
});
