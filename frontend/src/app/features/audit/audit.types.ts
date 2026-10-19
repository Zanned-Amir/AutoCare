export const AuditPermissions = {
  AUDIT_READ: 'audit:read',
} as const;

export type AuditTargetType = 'USER' | 'ORGANIZATION' | 'AUTO_SERVICE' | 'ROLE';

/** Mirrors the backend AuditLogResponse. */
export interface AuditLog {
  id: number;
  actorId: number;
  actorName: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: number;
  details: {
    roles?: string[];
    memberUserId?: number;
    memberName?: string;
    value?: string;
    name?: string;
    permissions?: string[];
  };
  createdAt: string;
}

export const auditActionLabels: Record<string, string> = {
  USER_INVITED: 'a ouvert le compte et envoyé l’invitation',
  USER_SUSPENDED: 'a suspendu le compte',
  USER_UNSUSPENDED: 'a réactivé le compte',
  USER_ROLES_CHANGED: 'a changé les rôles',
  ORGANIZATION_APPROVED: 'a validé l’entreprise',
  ORGANIZATION_SUSPENDED: 'a suspendu l’entreprise',
  ORGANIZATION_MEMBER_ADDED: 'a ajouté un membre',
  ORGANIZATION_MEMBER_ROLE_CHANGED: 'a changé le rôle d’un membre',
  ORGANIZATION_MEMBER_PERMISSIONS_CHANGED: 'a personnalisé les droits d’un membre',
  ORGANIZATION_MEMBER_STATUS_CHANGED: 'a changé le statut d’un membre',
  ORGANIZATION_MEMBER_REMOVED: 'a retiré un membre',
  AUTO_SERVICE_DEACTIVATED: 'a retiré le service du catalogue',
  AUTO_SERVICE_REACTIVATED: 'a remis le service au catalogue',
  ROLE_CREATED: 'a créé le rôle',
  ROLE_UPDATED: 'a modifié les permissions du rôle',
  ROLE_DELETED: 'a supprimé le rôle',
};
