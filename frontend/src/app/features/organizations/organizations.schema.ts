import { z } from 'zod';

/** Mirrors the backend Create/UpdateOrganizationRequest validation. */
export const organizationFormSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(120, '120 caractères maximum'),
  type: z.enum(['PROVIDER', 'SELLER']),
  description: z.string().max(1000, '1000 caractères maximum'),
  phone: z.string().trim().min(1, 'Le téléphone est obligatoire').max(30, '30 caractères maximum'),
  governorate: z.string().min(1, 'Choisissez un gouvernorat'),
  city: z.string().trim().min(1, 'La ville est obligatoire').max(80, '80 caractères maximum'),
  address: z.string().max(255, '255 caractères maximum'),
  serviceZone: z.string().max(255, '255 caractères maximum'),
  /** Picked on the map; both empty means the governorate's centre is shown. */
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export type OrganizationFormValue = z.infer<typeof organizationFormSchema>;

export const addMemberSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  roleKey: z.enum([
    'PROVIDER_MANAGER',
    'PROVIDER_RECEPTIONIST',
    'PROVIDER_TECHNICIAN',
    'PROVIDER_OWNER',
    'SELLER_OWNER',
    'SELLER_MANAGER',
    'SELLER_STAFF',
  ]),
});

export type AddMemberValue = z.infer<typeof addMemberSchema>;
