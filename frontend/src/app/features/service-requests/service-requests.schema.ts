import { z } from 'zod';

const today = () => new Date().toISOString().slice(0, 10);

/** Mirrors CreateServiceRequestRequest. Ids are strings for the selects. */
export const serviceRequestSchema = z
  .object({
    vehicleId: z.string().min(1, 'Choisissez un véhicule'),
    serviceId: z.string().min(1, 'Choisissez un service'),
    locationType: z.enum(['HOME', 'AT_PROVIDER']),
    location: z.string().max(300, '300 caractères maximum'),
    desiredDate: z
      .string()
      .min(1, 'Choisissez une date')
      .refine((value) => value >= today(), 'La date est passée'),
    /** "HH:mm" of a free slot, '' for no precise time. */
    desiredTime: z.string(),
    note: z.string().max(1000, '1000 caractères maximum'),
  })
  .refine((value) => value.locationType !== 'HOME' || value.location.trim().length > 0, {
    message: 'Indiquez votre adresse',
    path: ['location'],
  });

export type ServiceRequestValue = z.infer<typeof serviceRequestSchema>;
