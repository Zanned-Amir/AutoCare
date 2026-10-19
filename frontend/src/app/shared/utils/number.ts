const formatter = new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 });

/** 84500 -> "84 500" */
export function formatNumber(value: number): string {
  return formatter.format(value);
}
