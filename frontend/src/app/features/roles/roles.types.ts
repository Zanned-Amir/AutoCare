import { grants } from '@core/auth/permission';

export { RolePermissions } from './roles.permissions';

/** Mirrors the backend RoleResponse. */
export interface Role {
  id: number;
  /** Key put in tokens (UPPER_SNAKE), fixed once created. */
  name: string;
  label: string;
  description: string | null;
  permissions: string[];
  /** Lets its users open the backoffice. */
  backoffice: boolean;
  /** Seeded role: cannot be deleted or renamed. */
  system: boolean;
  memberCount: number;
  createdAt: string;
}

export interface RoleValue {
  name: string;
  label: string;
  description: string;
  permissions: string[];
  backoffice: boolean;
}

export interface CatalogAction {
  key: string;
  label: string;
}

export interface CatalogModule {
  key: string;
  label: string;
  actions: CatalogAction[];
}

export interface CatalogGroup {
  label: string;
  modules: CatalogModule[];
}

const a = (key: string, label: string): CatalogAction => ({ key, label });
const READ = a('read', 'Lire');
const MANAGE = a('manage', 'Gérer');

/**
 * The backend's resource:action strings (docs/MODULES.md, "Permission catalog"), grouped
 * for the matrix. Kept in sync by hand; permissions outside it are kept untouched.
 */
export const PERMISSION_CATALOG: CatalogGroup[] = [
  {
    label: 'Équipe & sécurité',
    modules: [
      { key: 'user', label: 'Utilisateurs', actions: [READ, MANAGE] },
      { key: 'role', label: 'Rôles & permissions', actions: [READ, MANAGE] },
      { key: 'audit', label: 'Journal d’audit', actions: [READ] },
    ],
  },
  {
    label: 'Entreprises',
    modules: [
      {
        key: 'organization',
        label: 'Entreprises',
        actions: [a('create', 'Créer'), READ, a('update', 'Modifier'), a('approve', 'Valider')],
      },
      { key: 'member', label: 'Équipes des entreprises', actions: [READ, MANAGE] },
    ],
  },
  {
    label: 'Catalogue',
    modules: [
      { key: 'service', label: 'Services', actions: [READ, MANAGE] },
      { key: 'diagnostic', label: 'Diagnostic guidé', actions: [a('use', 'Utiliser'), MANAGE] },
    ],
  },
  {
    label: 'Demandes & véhicules',
    modules: [
      {
        key: 'request',
        label: 'Demandes',
        actions: [
          a('create', 'Créer'),
          READ,
          a('accept', 'Accepter'),
          a('reject', 'Refuser'),
          a('update_status', 'Avancer'),
          a('cancel', 'Annuler'),
        ],
      },
      {
        key: 'vehicle',
        label: 'Véhicules',
        actions: [a('create', 'Créer'), READ, a('update', 'Modifier'), a('delete', 'Supprimer')],
      },
      { key: 'history', label: 'Carnet d’entretien', actions: [READ] },
      { key: 'review', label: 'Avis', actions: [a('create', 'Publier'), READ] },
      { key: 'notification', label: 'Notifications', actions: [READ] },
    ],
  },
  {
    label: 'Support & développeurs',
    modules: [
      { key: 'ticket', label: 'Tickets', actions: [a('create', 'Créer'), READ, MANAGE] },
      {
        key: 'helpdesk',
        label: 'Délais de support (SLA)',
        actions: [a('configure', 'Configurer')],
      },
      { key: 'apikey', label: 'Clés API', actions: [MANAGE] },
    ],
  },
];

export const FULL_ACCESS = '*:*';

/** Granted directly, through `resource:*`, `*:action` or `*:*`. */
export function hasPermission(permissions: string[], key: string): boolean {
  return grants(permissions, key);
}

/**
 * Checks or unchecks one action. Unchecking an action held through `resource:*` expands it
 * into the other actions; checking the last missing one folds them back into `resource:*`.
 */
export function togglePermission(
  permissions: string[],
  module: CatalogModule,
  actionKey: string,
  checked: boolean,
): string[] {
  const wildcard = `${module.key}:*`;
  const key = `${module.key}:${actionKey}`;
  const next = new Set(permissions);
  if (checked) {
    next.add(key);
    if (module.actions.every((action) => next.has(`${module.key}:${action.key}`))) {
      module.actions.forEach((action) => next.delete(`${module.key}:${action.key}`));
      next.add(wildcard);
    }
  } else {
    if (next.has(wildcard)) {
      next.delete(wildcard);
      module.actions.forEach((action) => next.add(`${module.key}:${action.key}`));
    }
    next.delete(key);
  }
  return [...next].sort();
}

/** "Accès complet", or the module labels the role reaches. */
export function summarizeAccess(permissions: string[]): string {
  if (permissions.includes(FULL_ACCESS)) return 'Accès complet';
  const modules = PERMISSION_CATALOG.flatMap((group) => group.modules).filter((module) =>
    module.actions.some((action) => hasPermission(permissions, `${module.key}:${action.key}`)),
  );
  return modules.length ? modules.map((module) => module.label).join(', ') : 'Aucun accès';
}
