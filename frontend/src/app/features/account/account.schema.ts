import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Le nom est obligatoire').max(120, '120 caractères maximum'),
  phone: z.string().max(30, '30 caractères maximum'),
  locale: z.enum(['fr', 'en']),
});

export const changePasswordSchema = z
  .object({
    /** Empty for an OAuth account that has no password yet; the API checks it otherwise. */
    currentPassword: z.string(),
    newPassword: z.string().min(8, '8 caractères minimum').max(72, '72 caractères maximum'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const changeEmailSchema = z.object({
  newEmail: z.email('Adresse e-mail invalide').max(254),
  currentPassword: z.string().min(1, 'Le mot de passe actuel est obligatoire'),
});

export const deactivateSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est obligatoire'),
});

export type ProfileValue = z.infer<typeof profileSchema>;
export type ChangePasswordValue = z.infer<typeof changePasswordSchema>;
export type ChangeEmailValue = z.infer<typeof changeEmailSchema>;
export type DeactivateValue = z.infer<typeof deactivateSchema>;
