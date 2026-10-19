import { CatalogPermissions } from '@features/catalog/catalog.permissions';
import { IconName } from '@shared/ui';
import { DiagnosticPermissions } from '@features/diagnostic/diagnostic.types';
import { ApiKeyPermissions } from '@features/api-keys/api-keys.types';
import { HelpdeskPermissions } from '@features/helpdesk/helpdesk.types';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { RolePermissions } from '@features/roles/roles.types';
import { UserPermissions } from '@features/users/users.permissions';

export interface AdminNavItem {
  path: string;
  label: string;
  icon: IconName;
  /** Absent: every staff member may open it. */
  permission?: string;
  /** Hidden when the user has this permission (another entry already covers it). */
  hiddenWith?: string;
  /** Pinned at the bottom of the sidebar, under the sections. */
  bottom?: boolean;
}

/** Backoffice sections, in menu order, with the permission each needs. */
export const ADMIN_NAV: AdminNavItem[] = [
  { path: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
  {
    path: 'catalog',
    label: 'Catalogue',
    icon: 'list',
    permission: CatalogPermissions.SERVICE_READ,
  },
  {
    path: 'diagnostics',
    label: 'Diagnostic',
    icon: 'diagnostic',
    permission: DiagnosticPermissions.DIAGNOSTIC_MANAGE,
  },
  {
    path: 'organizations',
    label: 'Entreprises',
    icon: 'building',
    permission: OrganizationPermissions.ORGANIZATION_APPROVE,
  },
  {
    path: 'organizations/new',
    label: 'Nouvelle entreprise',
    icon: 'building',
    permission: OrganizationPermissions.ORGANIZATION_CREATE,
    hiddenWith: OrganizationPermissions.ORGANIZATION_APPROVE,
  },
  {
    path: 'requests',
    label: 'Demandes',
    icon: 'requests',
    permission: ServiceRequestPermissions.REQUEST_READ,
  },
  { path: 'users', label: 'Utilisateurs', icon: 'users', permission: UserPermissions.USER_READ },
  {
    path: 'roles',
    label: 'Rôles & permissions',
    icon: 'shield',
    permission: RolePermissions.ROLE_READ,
  },
  { path: 'api-keys', label: 'Clés API', icon: 'key', permission: ApiKeyPermissions.MANAGE },
  {
    path: 'helpdesk',
    label: 'Support',
    icon: 'headset',
    permission: HelpdeskPermissions.TICKET_MANAGE,
    bottom: true,
  },
];
