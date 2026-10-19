const dateFormat = new Intl.DateTimeFormat('fr-TN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
});

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateFormat.format(new Date(value)) : '—';
}

/** "dans 3 h", "en retard de 20 min". */
export function formatDue(value: string | null | undefined): string {
  if (!value) return '—';
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const abs = Math.abs(minutes);
  const text =
    abs < 60
      ? `${abs} min`
      : abs < 1440
        ? `${Math.round(abs / 60)} h`
        : `${Math.round(abs / 1440)} j`;
  return minutes >= 0 ? `dans ${text}` : `en retard de ${text}`;
}
