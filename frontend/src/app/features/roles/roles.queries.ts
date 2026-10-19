import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { userKeys } from '@features/users/users.queries';
import { RolesApi } from './roles.api';
import { RoleValue } from './roles.types';

export const roleKeys = {
  all: ['admin-roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  detail: (id: number) => [...roleKeys.all, 'detail', id] as const,
};

export function injectRolesQuery(enabled: () => boolean = () => true) {
  const api = inject(RolesApi);
  return injectQuery(() => ({
    queryKey: roleKeys.list(),
    queryFn: () => api.listRoles(),
    enabled: enabled(),
  }));
}

export function injectRoleQuery(id: () => number | null) {
  const api = inject(RolesApi);
  return injectQuery(() => ({
    queryKey: roleKeys.detail(id() ?? 0),
    queryFn: () => api.getRole(id()!),
    enabled: id() !== null,
    retry: false,
  }));
}

/** Role changes also move users (deletion reassigns them), so user lists are refreshed. */
export function injectRoleMutations() {
  const api = inject(RolesApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: roleKeys.all });
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
  };
  return {
    save: injectMutation(() => ({
      mutationFn: ({ id, value }: { id: number | null; value: RoleValue }) =>
        api.saveRole(id, value),
      onSuccess,
    })),
    remove: injectMutation(() => ({
      mutationFn: ({ id, replacementRoleId }: { id: number; replacementRoleId: number | null }) =>
        api.deleteRole(id, replacementRoleId),
      onSuccess,
    })),
  };
}
