import { IconName } from '@shared/ui';

/** Icons an admin can give a catalog service, with what they suggest. */
export const SERVICE_ICONS: { name: IconName; label: string }[] = [
  { name: 'droplet', label: 'Vidange, huile' },
  { name: 'disc', label: 'Freins' },
  { name: 'tire', label: 'Pneus' },
  { name: 'battery', label: 'Batterie' },
  { name: 'suspension', label: 'Suspension' },
  { name: 'snowflake', label: 'Climatisation' },
  { name: 'thermometer', label: 'Refroidissement' },
  { name: 'zap', label: 'Électricité' },
  { name: 'lightbulb', label: 'Éclairage' },
  { name: 'fan', label: 'Ventilation' },
  { name: 'wind', label: 'Filtres' },
  { name: 'fuel', label: 'Carburant, injection' },
  { name: 'gauge', label: 'Diagnostic, contrôle' },
  { name: 'cog', label: 'Moteur, boîte' },
  { name: 'paintbrush', label: 'Carrosserie, peinture' },
  { name: 'spray-can', label: 'Lavage, polish' },
  { name: 'sparkles', label: 'Nettoyage intérieur' },
  { name: 'truck', label: 'Dépannage, remorquage' },
  { name: 'car-key', label: 'Clés, serrurerie' },
  { name: 'hammer', label: 'Mécanique générale' },
  { name: 'shield', label: 'Contrôle technique' },
  { name: 'car', label: 'Véhicule' },
  { name: 'wrench', label: 'Atelier (par défaut)' },
];

const KNOWN = new Set<string>(SERVICE_ICONS.map((icon) => icon.name));

/** Icon per seeded service name, for services saved before they had an icon. */
const BY_NAME: Record<string, IconName> = {
  vidange: 'droplet',
  freinage: 'disc',
  pneumatiques: 'tire',
  batterie: 'battery',
  suspension: 'suspension',
  climatisation: 'snowflake',
  refroidissement: 'thermometer',
  electricite: 'zap',
};

/** The icon chosen in the catalog, else a guess from the name, else the wrench. */
export function serviceIcon(name: string | null | undefined, icon?: string | null): IconName {
  if (icon && KNOWN.has(icon)) return icon as IconName;
  const key = (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return BY_NAME[key] ?? 'wrench';
}
