import { z } from 'zod';

/** Mirrors SaveMaintenanceRecordRequest. serviceId is a string for the select ('' = none). */
export const maintenanceRecordSchema = z.object({
  date: z
    .string()
    .min(1, 'La date est obligatoire')
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      'La date ne peut pas être dans le futur',
    ),
  mileage: z
    .number({ error: 'Le kilométrage est obligatoire' })
    .int()
    .min(0, 'Le kilométrage ne peut pas être négatif')
    .max(2_000_000, 'Kilométrage trop élevé'),
  serviceId: z.string(),
  description: z
    .string()
    .trim()
    .min(1, 'Décrivez l’intervention')
    .max(500, '500 caractères maximum'),
  result: z.string().max(2000, '2000 caractères maximum'),
});

/**
 * Mirrors SaveMaintenanceReminderRequest. serviceId and dueMileage are strings ('' = none);
 * at least a date or a mileage.
 */
export const maintenanceReminderSchema = z
  .object({
    title: z.string().trim().min(1, 'Donnez un titre').max(120, '120 caractères maximum'),
    serviceId: z.string(),
    dueDate: z.string(),
    dueMileage: z.string().regex(/^\d{0,7}$/, 'Kilométrage invalide'),
    note: z.string().max(500, '500 caractères maximum'),
  })
  .refine((value) => value.dueDate !== '' || value.dueMileage !== '', {
    message: 'Indiquez une date, un kilométrage ou les deux',
    path: ['dueDate'],
  });

export type MaintenanceReminderValue = z.infer<typeof maintenanceReminderSchema>;

export type MaintenanceRecordValue = z.infer<typeof maintenanceRecordSchema>;
