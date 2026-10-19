import { BadgeTone } from '@shared/ui';

export type OrganizationType = 'PROVIDER' | 'SELLER';
export type OrganizationStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';
export type MemberStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';
export type MemberRoleKey =
  | 'PROVIDER_OWNER'
  | 'PROVIDER_MANAGER'
  | 'PROVIDER_RECEPTIONIST'
  | 'PROVIDER_TECHNICIAN'
  | 'SELLER_OWNER'
  | 'SELLER_MANAGER'
  | 'SELLER_STAFF'
  | 'CUSTOM';

/** Extra filters of GET /admin/organizations; `sort` is a Spring sort ("name,asc"). */
export interface OrganizationSearchFilters {
  q: string;
  type: OrganizationType | null;
  governorate: string | null;
  sort: string;
}

/** Mirrors the backend OrganizationResponse. */
export interface Organization {
  id: number;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  ownerId: number;
  description: string | null;
  phone: string;
  governorate: string;
  city: string;
  address: string | null;
  serviceZone: string | null;
  /** Day key ("mon".."sun") to "08:00-12:00,14:00-18:00"; empty = Monday to Saturday 08:00-18:00. */
  workingHours: Record<string, string>;
  /** Length of a bookable slot and how many clients it takes. */
  slotMinutes: number;
  slotCapacity: number;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface BookingScheduleValue {
  workingHours: Record<string, string>;
  slotMinutes: number;
  slotCapacity: number;
}

/** An organization the signed-in user belongs to, with their role in it. */
export interface MyOrganization {
  organization: Organization;
  roleKey: MemberRoleKey;
  permissions: string[];
}

export interface Member {
  id: number;
  userId: number;
  fullName: string | null;
  email: string | null;
  status: MemberStatus;
  roleKey: MemberRoleKey;
  permissions: string[];
  joinedAt: string;
}

/** One organization a user belongs to, whatever the member status (backoffice user page). */
export interface UserMembership {
  memberId: number;
  organization: Organization;
  roleKey: MemberRoleKey;
  status: MemberStatus;
  joinedAt: string;
}

export const organizationTypeLabels: Record<OrganizationType, string> = {
  PROVIDER: 'Prestataire (garage, service mobile)',
  SELLER: 'Vendeur de pièces',
};

export const organizationStatusLabels: Record<OrganizationStatus, string> = {
  PENDING: 'En attente de validation',
  APPROVED: 'Validée',
  SUSPENDED: 'Suspendue',
};

export const organizationStatusTones: Record<OrganizationStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  SUSPENDED: 'error',
};

export const memberRoleLabels: Record<MemberRoleKey, string> = {
  PROVIDER_OWNER: 'Propriétaire',
  PROVIDER_MANAGER: 'Gérant',
  PROVIDER_RECEPTIONIST: 'Réceptionniste',
  PROVIDER_TECHNICIAN: 'Technicien',
  SELLER_OWNER: 'Propriétaire',
  SELLER_MANAGER: 'Gérant',
  SELLER_STAFF: 'Vendeur',
  CUSTOM: 'Personnalisé',
};

export const memberStatusLabels: Record<MemberStatus, string> = {
  INVITED: 'Invité',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
};

/** Role templates allowed for an organization type (CUSTOM is set by editing permissions). */
export function roleKeysFor(type: OrganizationType): MemberRoleKey[] {
  return type === 'PROVIDER'
    ? ['PROVIDER_OWNER', 'PROVIDER_MANAGER', 'PROVIDER_RECEPTIONIST', 'PROVIDER_TECHNICIAN']
    : ['SELLER_OWNER', 'SELLER_MANAGER', 'SELLER_STAFF'];
}
