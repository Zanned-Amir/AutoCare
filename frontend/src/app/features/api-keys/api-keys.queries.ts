import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { ApiKeysApi } from './api-keys.api';
import { NewApiKey } from './api-keys.types';

const keys = { all: ['api-keys'] as const };

export function injectApiKeysQuery() {
  const api = inject(ApiKeysApi);
  return injectQuery(() => ({ queryKey: keys.all, queryFn: () => api.list() }));
}

export function injectApiCapabilitiesQuery() {
  const api = inject(ApiKeysApi);
  return injectQuery(() => ({
    queryKey: [...keys.all, 'capabilities'],
    queryFn: () => api.capabilities(),
    staleTime: Infinity,
  }));
}

export function injectApiKeyUsageQuery(id: () => number | null) {
  const api = inject(ApiKeysApi);
  return injectQuery(() => ({
    queryKey: [...keys.all, 'usage', id()],
    queryFn: () => api.usage(id()!),
    enabled: id() !== null,
  }));
}

export function injectApiKeyMutations() {
  const api = inject(ApiKeysApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: keys.all });
  return {
    create: injectMutation(() => ({ mutationFn: (v: NewApiKey) => api.create(v), onSuccess })),
    setStatus: injectMutation(() => ({
      mutationFn: (v: { id: number; status: 'ACTIVE' | 'DISABLED' }) =>
        api.setStatus(v.id, v.status),
      onSuccess,
    })),
    rotate: injectMutation(() => ({ mutationFn: (id: number) => api.rotate(id), onSuccess })),
    revoke: injectMutation(() => ({
      mutationFn: (v: { id: number; reason: string }) => api.revoke(v.id, v.reason),
      onSuccess,
    })),
  };
}
