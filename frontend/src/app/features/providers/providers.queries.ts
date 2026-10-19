import { inject } from '@angular/core';
import {
  QueryClient,
  injectMutation,
  injectQuery,
  keepPreviousData,
} from '@tanstack/angular-query-experimental';

import { ProvidersApi } from './providers.api';
import { ProviderServiceFormValue } from './providers.schema';
import { ProviderSearchParams } from './providers.types';

export const providerKeys = {
  all: ['providers'] as const,
  search: (params: ProviderSearchParams) => [...providerKeys.all, 'search', params] as const,
  profile: (organizationId: number) => [...providerKeys.all, 'profile', organizationId] as const,
  offer: (organizationId: number) => [...providerKeys.all, 'offer', organizationId] as const,
  adminOffer: (organizationId: number) =>
    [...providerKeys.all, 'admin', 'offer', organizationId] as const,
  providerCounts: () => [...providerKeys.all, 'admin', 'counts'] as const,
};

export function injectAdminOrganizationServicesQuery(organizationId: () => number) {
  const api = inject(ProvidersApi);
  return injectQuery(() => ({
    queryKey: providerKeys.adminOffer(organizationId()),
    queryFn: () => api.listOrganizationServicesAdmin(organizationId()),
  }));
}

/** Backoffice catalog: how many providers offer each service. */
export function injectProviderCountsQuery() {
  const api = inject(ProvidersApi);
  return injectQuery(() => ({
    queryKey: providerKeys.providerCounts(),
    queryFn: () => api.countProvidersByService(),
  }));
}

export function injectGovernorateLocationsQuery() {
  const api = inject(ProvidersApi);
  return injectQuery(() => ({
    queryKey: [...providerKeys.all, 'governorates'],
    queryFn: () => api.listGovernorateLocations(),
    staleTime: Infinity,
  }));
}

export function injectProviderSearchQuery(params: () => ProviderSearchParams) {
  const api = inject(ProvidersApi);
  return injectQuery(() => ({
    queryKey: providerKeys.search(params()),
    queryFn: () => api.searchProviders(params()),
    placeholderData: keepPreviousData,
  }));
}

export function injectProviderProfileQuery(organizationId: () => number) {
  const api = inject(ProvidersApi);
  return injectQuery(() => ({
    queryKey: providerKeys.profile(organizationId()),
    queryFn: () => api.getProviderProfile(organizationId()),
    retry: false,
  }));
}

export function injectProviderServicesQuery(organizationId: () => number, enabled: () => boolean) {
  const api = inject(ProvidersApi);
  return injectQuery(() => ({
    queryKey: providerKeys.offer(organizationId()),
    queryFn: () => api.listProviderServices(organizationId()),
    enabled: enabled(),
  }));
}

export function injectProviderServiceMutations(organizationId: () => number) {
  const api = inject(ProvidersApi);
  const queryClient = inject(QueryClient);
  // The offer also changes public search results and the profile page.
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: providerKeys.all });
  return {
    save: injectMutation(() => ({
      mutationFn: ({ id, value }: { id: number | null; value: ProviderServiceFormValue }) =>
        id === null
          ? api.offerProviderService(organizationId(), value)
          : api.updateProviderService(organizationId(), id, value),
      onSuccess,
    })),
    remove: injectMutation(() => ({
      mutationFn: (id: number) => api.removeProviderService(organizationId(), id),
      onSuccess,
    })),
  };
}
