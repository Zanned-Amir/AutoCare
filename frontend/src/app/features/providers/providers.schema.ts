import { z } from 'zod';

/** Mirrors the backend Offer/UpdateProviderServiceRequest. An empty price means "on quote". */
export const providerServiceFormSchema = z.object({
  /** A string because it is bound to a <select>; converted to a number when sent. */
  serviceId: z.string().regex(/^[1-9]\d*$/, 'Choisissez un service'),
  atHome: z.boolean(),
  indicativePrice: z
    .string()
    .trim()
    .regex(/^(\d{1,9}([.,]\d{1,3})?)?$/, 'Prix invalide (exemple : 85.500)'),
});

export type ProviderServiceFormValue = z.infer<typeof providerServiceFormSchema>;

/** "85,5" -> "85.5", "" -> null. The amount stays a string end to end. */
export function toPriceBody(price: string): string | null {
  const trimmed = price.trim();
  return trimmed ? trimmed.replace(',', '.') : null;
}
