import { z } from 'zod';

import { FUEL_TYPES } from './vehicles.types';

const maxYear = new Date().getFullYear() + 1;

/** Mirrors the backend Create/UpdateVehicleRequest validation. */
export const vehicleFormSchema = z.object({
  brand: z.string().trim().min(1, 'La marque est obligatoire').max(60, '60 caractères maximum'),
  model: z.string().trim().min(1, 'Le modèle est obligatoire').max(60, '60 caractères maximum'),
  year: z
    .number({ error: "L'année est obligatoire" })
    .int()
    .min(1950, 'Année minimum : 1950')
    .max(maxYear, `Année maximum : ${maxYear}`),
  fuelType: z.enum(FUEL_TYPES, { error: 'Choisissez un carburant' }),
  engine: z.string().max(60, '60 caractères maximum'),
  mileage: z
    .number({ error: 'Le kilométrage est obligatoire' })
    .int()
    .min(0, 'Le kilométrage ne peut pas être négatif')
    .max(2_000_000, 'Kilométrage trop élevé'),
  plate: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[0-9A-Za-z ]{4,20}$/.test(value),
      'Immatriculation invalide',
    ),
  vin: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$/.test(value),
      'Le numéro de châssis (VIN) a 17 caractères',
    ),
});

export type VehicleFormValue = z.infer<typeof vehicleFormSchema>;
