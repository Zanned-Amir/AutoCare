/**
 * Money comes from the API as a decimal string (BigDecimal) and is only formatted here, never computed with.
 * TND has 3 decimals (millimes).
 */
const formatter = new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' });

export function formatMoney(amount: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }
  return formatter.format(Number(amount));
}
