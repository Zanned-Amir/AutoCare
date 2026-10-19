import { z } from 'zod';

/** Mirrors the backend CreateUserRequest. */
export const createUserSchema = z.object({
  email: z.email('Adresse e-mail invalide').max(254),
  fullName: z.string().trim().min(1, 'Le nom est obligatoire').max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === '' || /^\+?[0-9 .-]{8,20}$/.test(value), 'Numéro invalide'),
  locale: z.enum(['fr', 'en']),
  admin: z.boolean(),
});

export type CreateUserValue = z.infer<typeof createUserSchema>;
