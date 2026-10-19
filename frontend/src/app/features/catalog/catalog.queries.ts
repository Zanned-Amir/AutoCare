import { inject } from '@angular/core';
import {
  QueryClient,
  injectMutation,
  injectQuery,
  keepPreviousData,
} from '@tanstack/angular-query-experimental';

import { CatalogApi } from './catalog.api';
import { AutoServiceFormValue } from './catalog.schema';
import { AutoServiceSearchParams } from './catalog.types';

export const catalogKeys = {
  all: ['catalog'] as const,
  active: () => [...catalogKeys.all, 'active'] as const,
  search: (params: AutoServiceSearchParams) => [...catalogKeys.all, 'search', params] as const,
};

export function injectActiveAutoServicesQuery() {
  const api = inject(CatalogApi);
  return injectQuery(() => ({
    queryKey: catalogKeys.active(),
    queryFn: () => api.listActiveAutoServices(),
    staleTime: 5 * 60_000,
  }));
}

export function injectAutoServiceSearchQuery(params: () => AutoServiceSearchParams) {
  const api = inject(CatalogApi);
  return injectQuery(() => ({
    queryKey: catalogKeys.search(params()),
    queryFn: () => api.searchAutoServices(params()),
    placeholderData: keepPreviousData,
  }));
}

export function injectAutoServiceActivationMutation() {
  const api = inject(CatalogApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.setAutoServiceActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  }));
}

export function injectSaveAutoServiceMutation() {
  const api = inject(CatalogApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ id, value }: { id: number | null; value: AutoServiceFormValue }) =>
      id === null ? api.createAutoService(value) : api.updateAutoService(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  }));
}
