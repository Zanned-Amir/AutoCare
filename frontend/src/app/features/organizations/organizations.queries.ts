import { inject } from '@angular/core';
import {
  QueryClient,
  injectMutation,
  injectQuery,
  keepPreviousData,
} from '@tanstack/angular-query-experimental';

import { CsvColumn, csvFilename, downloadCsv, fetchAllPages, toCsv } from '@shared/utils/csv';
import { OrganizationsApi } from './organizations.api';
import { AddMemberValue, OrganizationFormValue } from './organizations.schema';
import {
  BookingScheduleValue,
  MemberRoleKey,
  MemberStatus,
  Organization,
  OrganizationSearchFilters,
  OrganizationStatus,
  organizationStatusLabels,
} from './organizations.types';

export const organizationKeys = {
  all: ['organizations'] as const,
  mine: () => [...organizationKeys.all, 'mine'] as const,
  governorates: () => [...organizationKeys.all, 'governorates'] as const,
  members: (organizationId: number) =>
    [...organizationKeys.all, organizationId, 'members'] as const,
  admin: (status: OrganizationStatus | null, page: number, filters?: OrganizationSearchFilters) =>
    [...organizationKeys.all, 'admin', status, page, filters ?? null] as const,
};

export function injectMyOrganizationsQuery() {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: organizationKeys.mine(),
    queryFn: () => api.listMyOrganizations(),
  }));
}

export function injectGovernoratesQuery() {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: organizationKeys.governorates(),
    queryFn: () => api.listGovernorates(),
    staleTime: Infinity,
  }));
}

/** `admin` goes through /admin/organizations: any organization, and a chosen owner on creation. */
export interface SaveOrganizationInput {
  id: number | null;
  value: OrganizationFormValue;
  admin?: { ownerEmail: string; approve: boolean };
}

export function injectSaveOrganizationMutation() {
  const api = inject(OrganizationsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: async ({ id, value, admin }: SaveOrganizationInput) => {
      if (admin && id === null)
        return api.adminCreateOrganization(admin.ownerEmail, admin.approve, value);
      if (admin) return api.adminUpdateOrganization(id!, value);
      return id === null
        ? (await api.createOrganization(value)).organization
        : api.updateOrganization(id, value);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  }));
}

export function injectUpdateScheduleMutation() {
  const api = inject(OrganizationsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ id, value }: { id: number; value: BookingScheduleValue }) =>
      api.updateOrganizationSchedule(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  }));
}

export function injectMembersQuery(organizationId: () => number, enabled: () => boolean) {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: organizationKeys.members(organizationId()),
    queryFn: () => api.listMembers(organizationId()),
    enabled: enabled(),
  }));
}

/**
 * All member changes refresh the member list and "my organizations" (my own role may have
 * changed). `admin` goes through /admin/organizations.
 */
export function injectMemberMutations(
  organizationId: () => number,
  admin: () => boolean = () => false,
) {
  const api = inject(OrganizationsApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: organizationKeys.all });
  return {
    add: injectMutation(() => ({
      mutationFn: (value: AddMemberValue) => api.addMember(organizationId(), value, admin()),
      onSuccess,
    })),
    changeRole: injectMutation(() => ({
      mutationFn: ({ memberId, roleKey }: { memberId: number; roleKey: MemberRoleKey }) =>
        api.changeMemberRole(organizationId(), memberId, roleKey, admin()),
      onSuccess,
    })),
    changeStatus: injectMutation(() => ({
      mutationFn: ({ memberId, status }: { memberId: number; status: MemberStatus }) =>
        api.changeMemberStatus(organizationId(), memberId, status, admin()),
      onSuccess,
    })),
    remove: injectMutation(() => ({
      mutationFn: (memberId: number) => api.removeMember(organizationId(), memberId, admin()),
      onSuccess,
    })),
  };
}

const organizationColumns: CsvColumn<Organization>[] = [
  { label: 'ID', value: (o) => o.id },
  { label: 'Nom', value: (o) => o.name },
  { label: 'Type', value: (o) => (o.type === 'PROVIDER' ? 'Prestataire' : 'Vendeur') },
  { label: 'Statut', value: (o) => organizationStatusLabels[o.status] },
  { label: 'Téléphone', value: (o) => o.phone },
  { label: 'Gouvernorat', value: (o) => o.governorate },
  { label: 'Ville', value: (o) => o.city },
  { label: 'Adresse', value: (o) => o.address },
  { label: 'Zone desservie', value: (o) => o.serviceZone },
  { label: 'Créée le', value: (o) => o.createdAt.slice(0, 10) },
];

/** Backoffice: downloads every organization matching the filters as CSV. */
export function injectOrganizationsCsvExport() {
  const api = inject(OrganizationsApi);
  return async (status: OrganizationStatus | null, filters?: OrganizationSearchFilters) => {
    const rows = await fetchAllPages((page, size) =>
      api.searchOrganizations(status, page, filters, size),
    );
    downloadCsv(csvFilename('entreprises'), toCsv(organizationColumns, rows));
  };
}

export function injectAdminOrganizationsQuery(
  params: () => {
    status: OrganizationStatus | null;
    page: number;
    filters?: OrganizationSearchFilters;
  },
) {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: organizationKeys.admin(params().status, params().page, params().filters),
    queryFn: () => api.searchOrganizations(params().status, params().page, params().filters),
    placeholderData: keepPreviousData,
  }));
}

export function injectAdminOrganizationQuery(id: () => number) {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: [...organizationKeys.all, 'admin', 'detail', id()] as const,
    queryFn: () => api.adminGetOrganization(id()),
  }));
}

export function injectAdminOrganizationMembersQuery(
  id: () => number,
  enabled: () => boolean = () => true,
) {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: [...organizationKeys.all, 'admin', 'members', id()] as const,
    queryFn: () => api.adminListMembers(id()),
    enabled: enabled(),
  }));
}

/** Backoffice user page: the organizations this person belongs to. */
export function injectUserMembershipsQuery(userId: () => number) {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: [...organizationKeys.all, 'admin', 'user', userId()] as const,
    queryFn: () => api.listUserMemberships(userId()),
  }));
}

export function injectModerateOrganizationMutation() {
  const api = inject(OrganizationsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'suspend' }) =>
      action === 'approve' ? api.approveOrganization(id) : api.suspendOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  }));
}

/** `admin` reads through /admin/organizations (staff, any organization). */
export function injectOrganizationFilesQueries(
  organizationId: () => number,
  admin: () => boolean = () => false,
) {
  const api = inject(OrganizationsApi);
  return {
    logo: injectQuery(() => ({
      queryKey: ['organizations', organizationId(), 'logo', admin()],
      queryFn: () => api.getLogo(organizationId(), admin()),
    })),
    photos: injectQuery(() => ({
      queryKey: ['organizations', organizationId(), 'photos', admin()],
      queryFn: () => api.listPhotos(organizationId(), admin()),
    })),
    documents: injectQuery(() => ({
      queryKey: ['organizations', organizationId(), 'documents', admin()],
      queryFn: () => api.listDocuments(organizationId(), admin()),
    })),
  };
}

export function injectOrganizationFileMutations(
  organizationId: () => number,
  admin: () => boolean = () => false,
) {
  const api = inject(OrganizationsApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['organizations', organizationId()] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations', organizationId()] });
  };
  return {
    uploadLogo: injectMutation(() => ({
      mutationFn: (file: File) => api.uploadLogo(organizationId(), file, admin()),
      onSuccess,
    })),
    deleteLogo: injectMutation(() => ({
      mutationFn: () => api.deleteLogo(organizationId(), admin()),
      onSuccess,
    })),
    uploadPhoto: injectMutation(() => ({
      mutationFn: (file: File) => api.uploadPhoto(organizationId(), file, admin()),
      onSuccess,
    })),
    deletePhoto: injectMutation(() => ({
      mutationFn: (fileId: number) => api.deletePhoto(organizationId(), fileId, admin()),
      onSuccess,
    })),
    reorderPhotos: injectMutation(() => ({
      mutationFn: (fileIds: number[]) => api.reorderPhotos(organizationId(), fileIds, admin()),
      onSuccess: () => {
        onSuccess();
        // The cover shows on the public profile and search cards.
        void queryClient.invalidateQueries({ queryKey: ['providers'] });
      },
    })),
    uploadDocument: injectMutation(() => ({
      mutationFn: (file: File) => api.uploadDocument(organizationId(), file, admin()),
      onSuccess,
    })),
    deleteDocument: injectMutation(() => ({
      mutationFn: (fileId: number) => api.deleteDocument(organizationId(), fileId, admin()),
      onSuccess,
    })),
  };
}

export function injectOrganizationDocumentsForReviewQuery(organizationId: () => number | null) {
  const api = inject(OrganizationsApi);
  return injectQuery(() => ({
    queryKey: ['admin', 'organizations', organizationId(), 'documents'],
    queryFn: () => api.listDocumentsForReview(organizationId()!),
    enabled: organizationId() !== null,
  }));
}
