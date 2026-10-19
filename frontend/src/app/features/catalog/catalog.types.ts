export interface AutoService {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  /** Icon key chosen in the backoffice; null shows the default. */
  icon: string | null;
}

export interface AutoServiceSearchParams {
  q: string;
  page: number;
  size: number;
  /** Backoffice filter; absent or null lists both. */
  active?: boolean | null;
  /** Spring sort, e.g. "name,asc". */
  sort?: string;
}
