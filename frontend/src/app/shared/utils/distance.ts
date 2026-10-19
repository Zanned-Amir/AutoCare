/** "850 m", "2,4 km", "38 km". */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}
