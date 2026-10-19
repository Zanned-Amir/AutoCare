/** Mirrors the backend ProviderServiceResponse. Prices are decimal strings, null = on quote. */
export interface ProviderService {
  id: number;
  serviceId: number;
  serviceName: string;
  atHome: boolean;
  indicativePrice: string | null;
  currency: string;
}

/** Mirrors the backend ProviderSearchResult. */
export interface ProviderSearchResult {
  organizationId: number;
  name: string;
  description: string | null;
  phone: string;
  governorate: string;
  city: string;
  address: string | null;
  serviceZone: string | null;
  logoUrl: string | null;
  /** The gallery on the profile; only the cover (first photo) in search results. */
  photoUrls: string[];
  latitude: number | null;
  longitude: number | null;
  /** True when the point is the governorate's centre, not the real address. */
  approximateLocation: boolean;
  /** Only when the search was made from a position. */
  distanceKm: number | null;
  services: ProviderService[];
}

export interface ProviderSearchParams {
  q: string;
  serviceId: number | null;
  governorate: string | null;
  atHome: boolean;
  page: number;
  /** Search origin; results then come nearest first. Kept out of the URL (personal data). */
  near?: { latitude: number; longitude: number; radiusKm: number | null } | null;
  size?: number;
}

export interface GovernorateLocation {
  name: string;
  latitude: number;
  longitude: number;
}
