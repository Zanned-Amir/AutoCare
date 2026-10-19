import { inject } from '@angular/core';
import {
  QueryClient,
  injectMutation,
  injectQuery,
  keepPreviousData,
} from '@tanstack/angular-query-experimental';

import { CsvColumn, csvFilename, downloadCsv, fetchAllPages, toCsv } from '@shared/utils/csv';
import { UsersApi } from './users.api';
import { CreateUserValue } from './users.schema';
import { AdminUser, UserSearchParams } from './users.types';

export const userKeys = {
  all: ['admin-users'] as const,
  search: (params: UserSearchParams) => [...userKeys.all, 'search', params] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
};

export function injectUserQuery(id: () => number) {
  const api = inject(UsersApi);
  return injectQuery(() => ({
    queryKey: userKeys.detail(id()),
    queryFn: () => api.getUser(id()),
    retry: false,
  }));
}

const userColumns: CsvColumn<AdminUser>[] = [
  { label: 'ID', value: (u) => u.id },
  { label: 'Nom', value: (u) => u.fullName },
  { label: 'E-mail', value: (u) => u.email },
  { label: 'Téléphone', value: (u) => u.phone },
  { label: 'Rôles', value: (u) => u.roles.join(', ') },
  { label: 'Actif', value: (u) => u.active },
  { label: 'E-mail vérifié', value: (u) => u.emailVerified },
  { label: 'Mot de passe choisi', value: (u) => u.passwordSet },
  { label: 'Inscrit le', value: (u) => u.createdAt.slice(0, 10) },
];

/** Backoffice: downloads every account matching the search as CSV. */
export function injectUsersCsvExport() {
  const api = inject(UsersApi);
  return async (params: UserSearchParams) => {
    const rows = await fetchAllPages((page, size) => api.searchUsers({ ...params, page }, size));
    downloadCsv(csvFilename('utilisateurs'), toCsv(userColumns, rows));
  };
}

export function injectUsersQuery(params: () => UserSearchParams) {
  const api = inject(UsersApi);
  return injectQuery(() => ({
    queryKey: userKeys.search(params()),
    queryFn: () => api.searchUsers(params()),
    placeholderData: keepPreviousData,
  }));
}

export function injectUserMutations() {
  const api = inject(UsersApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: userKeys.all });
  return {
    create: injectMutation(() => ({
      mutationFn: (value: CreateUserValue) => api.createUser(value),
      onSuccess,
    })),
    resendInvitation: injectMutation(() => ({
      mutationFn: (id: number) => api.resendUserInvitation(id),
      onSuccess,
    })),
    suspend: injectMutation(() => ({ mutationFn: (id: number) => api.suspendUser(id), onSuccess })),
    unsuspend: injectMutation(() => ({
      mutationFn: (id: number) => api.unsuspendUser(id),
      onSuccess,
    })),
    setRoles: injectMutation(() => ({
      mutationFn: ({ id, roles }: { id: number; roles: string[] }) => api.setUserRoles(id, roles),
      onSuccess,
    })),
  };
}
