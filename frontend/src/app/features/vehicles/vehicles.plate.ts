/**
 * Tunisian plate formats offered in the vehicle form.
 *
 * The backend still stores ONE string (`plate`, 4-20 letters / digits / spaces), so a plate is
 * serialized as text and parsed back when editing:
 *   TUN    "4567 TUN 123"      RS     "123456 RS"      FCR   "123456 FCR"
 *   DOUANE "12 34 56789 01"    ETAT   "12 345678"      AUTRE free text
 * Plates saved before this change (e.g. "123 TU 4567") simply open as "Autre".
 *
 * To adjust a format (order, number of digits), edit PLATE_FORMATS only.
 */
export type PlateType = 'TUN' | 'RS' | 'FCR' | 'DOUANE' | 'ETAT' | 'AUTRE';

export interface PlateSegment {
  label: string;
  min: number;
  max: number;
  placeholder: string;
  digitsOnly: boolean;
}

export interface PlateFormat {
  type: PlateType;
  label: string;
  /** Printed order: a number is the index of a segment (an input), a string is a literal. */
  tokens: (string | number)[];
  segments: PlateSegment[];
}

/** Same rule as the backend (CreateVehicleRequest / UpdateVehicleRequest). */
export const PLATE_BACKEND_REGEX = /^[0-9A-Za-z ]{4,20}$/;

/** Emitted while the plate is incomplete or wrong: never matches the backend rule. */
export const INVALID_PLATE = '!';

const digits = (label: string, min: number, max: number, placeholder: string): PlateSegment => ({
  label,
  min,
  max,
  placeholder,
  digitsOnly: true,
});

export const PLATE_FORMATS: PlateFormat[] = [
  {
    type: 'TUN',
    label: 'TUN',
    tokens: [0, 'TUN', 1],
    segments: [digits('1er numéro', 1, 4, '1234'), digits('2e numéro', 1, 3, '123')],
  },
  { type: 'RS', label: 'RS', tokens: [0, 'RS'], segments: [digits('Numéro', 1, 6, '123456')] },
  { type: 'FCR', label: 'FCR', tokens: [0, 'FCR'], segments: [digits('Numéro', 1, 6, '123456')] },
  {
    type: 'DOUANE',
    label: 'Douane',
    tokens: [0, 1, 2, 3],
    segments: [
      digits('1er bloc', 2, 2, '12'),
      digits('2e bloc', 2, 2, '34'),
      digits('3e bloc', 5, 5, '56789'),
      digits('4e bloc', 2, 2, '01'),
    ],
  },
  {
    type: 'ETAT',
    label: 'État',
    tokens: [0, 1],
    segments: [digits('1er bloc', 2, 2, '12'), digits('2e bloc', 6, 6, '345678')],
  },
  {
    type: 'AUTRE',
    label: 'Autre',
    tokens: [0],
    segments: [
      { label: 'Immatriculation', min: 4, max: 20, placeholder: 'AB 1234', digitsOnly: false },
    ],
  },
];

export const formatOf = (type: PlateType): PlateFormat =>
  PLATE_FORMATS.find((format) => format.type === type)!;

export const emptyParts = (type: PlateType): string[] => formatOf(type).segments.map(() => '');

const isEmpty = (parts: string[]): boolean => parts.every((part) => part.trim() === '');

function segmentError(segment: PlateSegment, value: string): string | null {
  const { label, min, max } = segment;
  if (value === '') return `${label} : champ obligatoire`;
  if (!segment.digitsOnly) {
    if (!/^[0-9A-Za-z ]+$/.test(value)) return `${label} : lettres, chiffres et espaces uniquement`;
    if (value.length < min) return `${label} : ${min} caractères minimum`;
    if (value.length > max) return `${label} : ${max} caractères maximum`;
    return null;
  }
  if (!/^\d+$/.test(value)) return `${label} : chiffres uniquement`;
  if (value.length < min || value.length > max) {
    return min === max
      ? `${label} : exactement ${max} chiffres`
      : `${label} : de ${min} à ${max} chiffres`;
  }
  return null;
}

/** One message (or null) per segment. Nothing typed at all is fine: the plate is optional. */
export function validateSegments(type: PlateType, parts: string[]): (string | null)[] {
  const { segments } = formatOf(type);
  const values = segments.map((_, i) => (parts[i] ?? '').trim());
  if (isEmpty(values)) return segments.map(() => null);
  return segments.map((segment, i) => segmentError(segment, values[i] ?? ''));
}

function serialize(type: PlateType, parts: string[]): string {
  return formatOf(type)
    .tokens.map((token) => (typeof token === 'number' ? (parts[token] ?? '').trim() : token))
    .filter(Boolean)
    .join(' ');
}

/** The string sent to the backend: '' (no plate), the plate, or INVALID_PLATE. */
export function plateValue(type: PlateType, parts: string[]): string {
  if (isEmpty(parts)) return '';
  if (validateSegments(type, parts).some(Boolean)) return INVALID_PLATE;
  return serialize(type, parts);
}

function regexOf(format: PlateFormat): RegExp {
  const body = format.tokens
    .map((token) => {
      if (typeof token === 'string') return token;
      const segment = format.segments[token]!;
      return `(\\d{${segment.min},${segment.max}})`;
    })
    .join(' ');
  return new RegExp(`^${body}$`, 'i');
}

/** Back from the stored string to a type and its segments. Unknown shapes become "Autre". */
export function parsePlate(value: string): { type: PlateType; parts: string[] } {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return { type: 'TUN', parts: emptyParts('TUN') };
  for (const format of PLATE_FORMATS) {
    if (format.type === 'AUTRE') continue;
    const match = regexOf(format).exec(text);
    if (match) return { type: format.type, parts: match.slice(1) };
  }
  return { type: 'AUTRE', parts: [text] };
}
