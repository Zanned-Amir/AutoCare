import { BadgeTone } from '@shared/ui';

export { HelpdeskPermissions } from './helpdesk.permissions';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TicketCategory =
  'ACCOUNT' | 'SERVICE_REQUEST' | 'PROVIDER' | 'VEHICLE' | 'BILLING' | 'TECHNICAL' | 'OTHER';

export interface Ticket {
  publicId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  organizationId: number | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface AgentTicket extends Ticket {
  channel: string;
  customerId: number;
  customerName: string | null;
  customerEmail: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  escalationLevel: number;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  slaPaused: boolean;
  firstResponseBreachedAt: string | null;
  resolutionBreachedAt: string | null;
  firstResponseAt: string | null;
}

export interface TicketMessage {
  id: number;
  authorType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  authorName: string | null;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface TicketEvent {
  type: string;
  actorId: number | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface SlaPolicy {
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  active: boolean;
}

export interface HelpdeskStats {
  byStatus: Record<TicketStatus, number>;
  unassigned: number;
  activeBreached: number;
  assignedToMe: number;
}

export const STATUSES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'RESOLVED',
  'CLOSED',
];
export const PRIORITIES: TicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
export const CATEGORIES: TicketCategory[] = [
  'ACCOUNT',
  'SERVICE_REQUEST',
  'PROVIDER',
  'VEHICLE',
  'BILLING',
  'TECHNICAL',
  'OTHER',
];

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Ouverte',
  IN_PROGRESS: 'En cours',
  WAITING_ON_CUSTOMER: 'En attente de réponse',
  RESOLVED: 'Résolue',
  CLOSED: 'Fermée',
};
export const statusTones: Record<TicketStatus, BadgeTone> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  WAITING_ON_CUSTOMER: 'primary',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};
export const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};
export const priorityTones: Record<TicketPriority, BadgeTone> = {
  LOW: 'neutral',
  NORMAL: 'primary',
  HIGH: 'warning',
  URGENT: 'error',
};
export const categoryLabels: Record<TicketCategory, string> = {
  ACCOUNT: 'Mon compte',
  SERVICE_REQUEST: 'Une demande de service',
  PROVIDER: 'Un prestataire',
  VEHICLE: 'Mon véhicule',
  BILLING: 'Facturation',
  TECHNICAL: 'Problème technique',
  OTHER: 'Autre',
};

export const eventLabels: Record<string, string> = {
  CREATED: 'Demande créée',
  STATUS_CHANGED: 'Statut modifié',
  PRIORITY_CHANGED: 'Priorité modifiée',
  CATEGORY_CHANGED: 'Catégorie modifiée',
  ASSIGNED: 'Assignée',
  UNASSIGNED: 'Libérée',
  ESCALATED: 'Escaladée',
  REOPENED: 'Rouverte',
  FIRST_RESPONSE_BREACHED: 'Délai de 1re réponse dépassé',
  RESOLUTION_BREACHED: 'Délai de résolution dépassé',
  AUTO_CLOSED: 'Fermée automatiquement',
};
