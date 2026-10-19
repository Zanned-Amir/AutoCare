import { z } from 'zod';

/** Mirrors the backend Create/UpdateAutoServiceRequest validation. */
export const autoServiceFormSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(120, '120 caractères maximum'),
  description: z.string().max(1000, '1000 caractères maximum'),
  active: z.boolean(),
  /** Icon key from SERVICE_ICONS, '' for the default. */
  icon: z.string(),
});

export type AutoServiceFormValue = z.infer<typeof autoServiceFormSchema>;
