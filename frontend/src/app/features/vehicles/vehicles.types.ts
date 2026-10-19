export const FUEL_TYPES = ['ESSENCE', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const fuelTypeLabels: Record<FuelType, string> = {
  ESSENCE: 'Essence',
  DIESEL: 'Diesel',
  HYBRID: 'Hybride',
  ELECTRIC: 'Électrique',
  LPG: 'GPL',
};

/** Mirrors the backend VehicleDto. */
export interface Vehicle {
  id: number;
  ownerId: number;
  brand: string;
  model: string;
  year: number;
  fuelType: FuelType;
  engine: string | null;
  mileage: number;
  /** "123 TU 4567"; null when not given. */
  plate: string | null;
  vin: string | null;
  createdAt: string;
}
