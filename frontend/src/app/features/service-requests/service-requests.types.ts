import { BadgeTone } from '@shared/ui';

export const ServiceRequestPermissions = {
  REQUEST_CREATE: 'request:create',
  REQUEST_READ: 'request:read',
  REQUEST_ACCEPT: 'request:accept',
  REQUEST_REJECT: 'request:reject',
  REQUEST_UPDATE_STATUS: 'request:update_status',
  REQUEST_CANCEL: 'request:cancel',
} as const;

export const REQUEST_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type LocationType = 'HOME' | 'AT_PROVIDER';

/** Mirrors the backend ServiceRequestResponse. `customer` is only sent to the provider. */
export interface ServiceRequest {
  id: number;
  status: RequestStatus;
  desiredDate: string;
  /** "HH:mm:ss" when the client booked a time slot. */
  desiredTime: string | null;
  locationType: LocationType;
  location: string | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  service: { id: number; name: string | null };
  organization: { id: number; name: string; governorate: string; city: string } | null;
  vehicle: {
    id: number;
    brand: string;
    model: string;
    year: number;
    mileage: number;
    plate: string | null;
  } | null;
  customer: { id: number; fullName: string; phone: string | null; email: string } | null;
  diagnostic: { id: number; possibleCause: string | null } | null;
  /** The provider's price for this request; null until sent. */
  quote: Quote | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** A bookable time of a provider ("HH:mm:ss") and the places left (0 = full). */
export interface Slot {
  time: string;
  remaining: number;
}

/** Garage dashboard figures. `acceptedQuotes` is a decimal string (TND): format it, never compute. */
export interface OrganizationInsights {
  weeks: { weekStart: string; created: number; completed: number }[];
  topServices: { serviceId: number; name: string | null; count: number }[];
  acceptRate: number | null;
  acceptedQuotes: string;
  received: number;
  completed: number;
}

/** A chat message on a request. `authorName` is null for garage staff seen by the client. */
export interface RequestMessage {
  id: number;
  side: 'CLIENT' | 'PROVIDER';
  mine: boolean;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export type QuoteStatus = 'SENT' | 'ACCEPTED' | 'DECLINED';

/** `amount` is a decimal string (TND, 3 decimals): format it, never compute with it. */
export interface Quote {
  amount: string;
  currency: string;
  note: string | null;
  status: QuoteStatus;
  sentAt: string;
}

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  SENT: 'En attente de réponse',
  ACCEPTED: 'Accepté',
  DECLINED: 'Refusé',
};

export interface StatusChange {
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  actor: 'CLIENT' | 'PROVIDER';
  note: string | null;
  createdAt: string;
}

/** Backoffice filters of GET /admin/service-requests; dates are yyyy-MM-dd (creation day). */
export interface AdminRequestFilters {
  status: RequestStatus | null;
  /** Any of these catalog services; empty means all. */
  serviceIds?: number[];
  organizationId: number | null;
  userId: number | null;
  from: string | null;
  to: string | null;
  page: number;
  size?: number;
}

/** Mirrors the backend ServiceRequestStatsResponse ("today" is the Tunis day). */
export interface ServiceRequestStats {
  total: number;
  createdToday: number;
  byStatus: Record<RequestStatus, number>;
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Acceptée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};
export const requestStatusTones: Record<RequestStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral',
};
export const locationLabels: Record<LocationType, string> = {
  HOME: 'À domicile',
  AT_PROVIDER: 'Chez le prestataire',
};
