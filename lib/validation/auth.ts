import { z } from "zod";

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

export const setNameSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 letras.")
    .max(40, "El nombre no puede superar los 40 caracteres.")
    .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/, "El nombre solo puede tener letras y espacios, sin números ni símbolos."),
});
