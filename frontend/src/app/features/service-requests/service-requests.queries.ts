import { inject } from '@angular/core';
import {
  QueryClient,
  injectMutation,
  injectQuery,
  keepPreviousData,
} from '@tanstack/angular-query-experimental';

import { CompleteReport, ServiceRequestsApi } from './service-requests.api';
import { ServiceRequestValue } from './service-requests.schema';
import { CsvColumn, csvFilename, downloadCsv, fetchAllPages, toCsv } from '@shared/utils/csv';
import {
  AdminRequestFilters,
  RequestMessage,
  RequestStatus,
  ServiceRequest,
  locationLabels,
  quoteStatusLabels,
  requestStatusLabels,
} from './service-requests.types';

export const requestKeys = {
  all: ['service-requests'] as const,
  mine: (status: RequestStatus | null, page: number) =>
    [...requestKeys.all, 'mine', status, page] as const,
  detail: (id: number) => [...requestKeys.all, 'detail', id] as const,
  organization: (organizationId: number) =>
    [...requestKeys.all, 'organization', organizationId] as const,
  admin: (filters: AdminRequestFilters) => [...requestKeys.all, 'admin', filters] as const,
  messages: (id: number, organizationId: number | null) =>
    [...requestKeys.all, 'messages', id, organizationId] as const,
  adminStats: () => [...requestKeys.all, 'admin', 'stats'] as const,
  adminHistory: (id: number) => [...requestKeys.all, 'admin', 'history', id] as const,
};

/** Backoffice: every request, filtered (also used by the user and organization pages). */
export function injectAdminRequestsQuery(
  filters: () => AdminRequestFilters,
  enabled: () => boolean = () => true,
) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: requestKeys.admin(filters()),
    queryFn: () => api.searchAdminRequests(filters()),
    placeholderData: keepPreviousData,
    enabled: enabled(),
  }));
}

const requestColumns: CsvColumn<ServiceRequest>[] = [
  { label: 'ID', value: (r) => r.id },
  { label: 'Créée le', value: (r) => r.createdAt.slice(0, 10) },
  { label: 'Statut', value: (r) => requestStatusLabels[r.status] },
  { label: 'Service', value: (r) => r.service.name },
  { label: 'Client', value: (r) => r.customer?.fullName },
  { label: 'Téléphone client', value: (r) => r.customer?.phone },
  { label: 'E-mail client', value: (r) => r.customer?.email },
  { label: 'Garage', value: (r) => r.organization?.name },
  { label: 'Gouvernorat', value: (r) => r.organization?.governorate },
  {
    label: 'Véhicule',
    value: (r) => (r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model} ${r.vehicle.year}` : ''),
  },
  { label: 'Immatriculation', value: (r) => r.vehicle?.plate },
  { label: 'Date souhaitée', value: (r) => r.desiredDate },
  { label: 'Heure', value: (r) => r.desiredTime?.slice(0, 5) },
  {
    label: 'Lieu',
    value: (r) => locationLabels[r.locationType] + (r.location ? ` · ${r.location}` : ''),
  },
  // Kept as the API's decimal string: no float rounding in the file.
  { label: 'Devis (DT)', value: (r) => r.quote?.amount },
  { label: 'Statut devis', value: (r) => (r.quote ? quoteStatusLabels[r.quote.status] : '') },
  { label: 'Terminée le', value: (r) => r.completedAt?.slice(0, 10) },
];

/** Backoffice: downloads every request matching the filters as CSV. */
export function injectAdminRequestsCsvExport() {
  const api = inject(ServiceRequestsApi);
  return async (filters: AdminRequestFilters) => {
    const rows = await fetchAllPages((page, size) =>
      api.searchAdminRequests({ ...filters, page, size }),
    );
    downloadCsv(csvFilename('demandes'), toCsv(requestColumns, rows));
  };
}

export function injectAdminRequestStatsQuery(enabled: () => boolean) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: requestKeys.adminStats(),
    queryFn: () => api.getAdminRequestStats(),
    enabled: enabled(),
  }));
}

/** History of the request opened in the backoffice list; idle while none is open. */
export function injectAdminRequestHistoryQuery(id: () => number | null) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: requestKeys.adminHistory(id() ?? 0),
    queryFn: () => api.historyAdmin(id()!),
    enabled: id() !== null,
  }));
}

export function injectMyRequestsQuery(status: () => RequestStatus | null, page: () => number) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: requestKeys.mine(status(), page()),
    queryFn: () => api.listMine(status(), page()),
    placeholderData: keepPreviousData,
  }));
}

export function injectMyRequestQuery(id: () => number) {
  const api = inject(ServiceRequestsApi);
  return {
    request: injectQuery(() => ({
      queryKey: requestKeys.detail(id()),
      queryFn: () => api.getMine(id()),
      retry: false,
    })),
    history: injectQuery(() => ({
      queryKey: [...requestKeys.detail(id()), 'history'],
      queryFn: () => api.historyMine(id()),
    })),
  };
}

export function injectCreateRequestMutation() {
  const api = inject(ServiceRequestsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (v: {
      organizationId: number;
      diagnosticId: number | null;
      value: ServiceRequestValue;
    }) => api.createRequest(v.organizationId, v.diagnosticId, v.value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestKeys.all }),
  }));
}

export function injectCancelRequestMutation() {
  const api = inject(ServiceRequestsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (v: { id: number; reason: string }) => api.cancel(v.id, v.reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestKeys.all }),
  }));
}

/** Polled while open: there is no push channel yet. */
export function injectRequestMessagesQuery(id: () => number, organizationId: () => number | null) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: requestKeys.messages(id(), organizationId()),
    queryFn: () => api.listMessages(organizationId(), id()),
    refetchInterval: 15_000,
  }));
}

export function injectPostMessageMutation(id: () => number, organizationId: () => number | null) {
  const api = inject(ServiceRequestsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (body: string) => api.postMessage(organizationId(), id(), body),
    onSuccess: (message: RequestMessage) =>
      queryClient.setQueryData<RequestMessage[]>(
        requestKeys.messages(id(), organizationId()),
        (messages) => [...(messages ?? []), message],
      ),
  }));
}

export function injectSlotsQuery(organizationId: () => number, date: () => string) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: [...requestKeys.all, 'slots', organizationId(), date()],
    queryFn: () => api.listSlots(organizationId(), date()),
    enabled: organizationId() > 0 && !!date(),
    staleTime: 30_000,
  }));
}

/** The client answers the provider's quote; accepting confirms the request. */
export function injectQuoteAnswerMutations() {
  const api = inject(ServiceRequestsApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: requestKeys.all });
  return {
    accept: injectMutation(() => ({ mutationFn: (id: number) => api.acceptQuote(id), onSuccess })),
    decline: injectMutation(() => ({
      mutationFn: (id: number) => api.declineQuote(id),
      onSuccess,
    })),
  };
}

export function injectOrganizationRequestsQuery(
  organizationId: () => number,
  status: () => RequestStatus | null,
  page: () => number,
) {
  const api = inject(ServiceRequestsApi);
  return {
    list: injectQuery(() => ({
      queryKey: [...requestKeys.organization(organizationId()), status(), page()],
      queryFn: () => api.listForOrganization(organizationId(), status(), page()),
      placeholderData: keepPreviousData,
    })),
    counts: injectQuery(() => ({
      queryKey: [...requestKeys.organization(organizationId()), 'counts'],
      queryFn: () => api.countForOrganization(organizationId()),
    })),
  };
}

/** The pro calendar; the provider mutations invalidate it through requestKeys.organization. */
export function injectOrganizationInsightsQuery(organizationId: () => number, weeks: () => number) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: [...requestKeys.organization(organizationId()), 'insights', weeks()],
    queryFn: () => api.insightsForOrganization(organizationId(), weeks()),
    enabled: organizationId() > 0,
    placeholderData: keepPreviousData,
  }));
}

export function injectOrganizationCalendarQuery(
  organizationId: () => number,
  range: () => { from: string; to: string },
) {
  const api = inject(ServiceRequestsApi);
  return injectQuery(() => ({
    queryKey: [...requestKeys.organization(organizationId()), 'calendar', range()],
    queryFn: () => api.calendar(organizationId(), range().from, range().to),
    placeholderData: keepPreviousData,
    enabled: organizationId() > 0,
  }));
}

export function injectProviderRequestMutations(organizationId: () => number) {
  const api = inject(ServiceRequestsApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: requestKeys.all });
  return {
    confirm: injectMutation(() => ({
      mutationFn: (id: number) => api.act(organizationId(), id, 'confirm'),
      onSuccess,
    })),
    start: injectMutation(() => ({
      mutationFn: (id: number) => api.act(organizationId(), id, 'start'),
      onSuccess,
    })),
    quote: injectMutation(() => ({
      mutationFn: (v: { id: number; amount: string; note: string }) =>
        api.sendQuote(organizationId(), v.id, v.amount, v.note),
      onSuccess,
    })),
    reject: injectMutation(() => ({
      mutationFn: (v: { id: number; reason: string }) =>
        api.reject(organizationId(), v.id, v.reason),
      onSuccess,
    })),
    complete: injectMutation(() => ({
      mutationFn: (v: { id: number; report: CompleteReport }) =>
        api.complete(organizationId(), v.id, v.report),
      onSuccess,
    })),
  };
}
