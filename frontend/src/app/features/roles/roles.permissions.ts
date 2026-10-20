/** Kept apart from roles.types.ts so routes and menus do not load the permission catalog. */
export const RolePermissions = {
  ROLE_READ: 'role:read',
  ROLE_MANAGE: 'role:manage',
} as const;
