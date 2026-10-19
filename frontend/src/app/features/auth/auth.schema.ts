import { z } from 'zod';

/** Mirrors the backend LoginRequest / RegisterRequest validation. */
export const loginSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Le nom est obligatoire').max(120, '120 caractères maximum'),
  email: z.email('Adresse e-mail invalide').max(254),
  phone: z.string().max(30, '30 caractères maximum'),
  password: z.string().min(8, '8 caractères minimum').max(72, '72 caractères maximum'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
});

/** The confirmation field only lives in the browser; the backend receives newPassword. */
export const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, '8 caractères minimum').max(72, '72 caractères maximum'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type ForgotPasswordValue = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordValue = z.infer<typeof newPasswordSchema>;
export type LoginValue = z.infer<typeof loginSchema>;
export type RegisterValue = z.infer<typeof registerSchema>;
