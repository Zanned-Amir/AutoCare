import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { StoredFile } from '@shared/types/stored-file';
import { AddMemberValue, OrganizationFormValue } from './organizations.schema';
import {
  BookingScheduleValue,
  Member,
  MemberRoleKey,
  MemberStatus,
  MyOrganization,
  Organization,
  OrganizationSearchFilters,
  OrganizationStatus,
  UserMembership,
} from './organizations.types';

/** Empty optional text fields are sent as null so the backend stores NULL, not ''. */
function toBody(value: OrganizationFormValue) {
  const blankToNull = (text: string) => (text.trim() ? text.trim() : null);
  return {
    ...value,
    description: blankToNull(value.description),
    address: blankToNull(value.address),
    serviceZone: blankToNull(value.serviceZone),
  };
}

function toFormData(file: File): FormData {
  const body = new FormData();
  body.append('file', file);
  return body;
}

@Injectable({ providedIn: 'root' })
export class OrganizationsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_URL}/organizations`;

  /** Files through the member's workspace, or through /admin for staff (any organization). */
  private filesUrl(organizationId: number, admin: boolean): string {
    return admin
      ? `${API_URL}/admin/organizations/${organizationId}`
      : `${this.baseUrl}/${organizationId}`;
  }

  getLogo(organizationId: number, admin = false): Promise<StoredFile | null> {
    return firstValueFrom(
      this.http.get<StoredFile | null>(`${this.filesUrl(organizationId, admin)}/logo`),
    );
  }

  uploadLogo(organizationId: number, file: File, admin = false): Promise<StoredFile> {
    return firstValueFrom(
      this.http.put<StoredFile>(`${this.filesUrl(organizationId, admin)}/logo`, toFormData(file)),
    );
  }

  deleteLogo(organizationId: number, admin = false): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.filesUrl(organizationId, admin)}/logo`));
  }

  listPhotos(organizationId: number, admin = false): Promise<StoredFile[]> {
    return firstValueFrom(
      this.http.get<StoredFile[]>(`${this.filesUrl(organizationId, admin)}/photos`),
    );
  }

  uploadPhoto(organizationId: number, file: File, admin = false): Promise<StoredFile> {
    return firstValueFrom(
      this.http.post<StoredFile>(
        `${this.filesUrl(organizationId, admin)}/photos`,
        toFormData(file),
      ),
    );
  }

  deletePhoto(organizationId: number, fileId: number, admin = false): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.filesUrl(organizationId, admin)}/photos/${fileId}`),
    );
  }

  listDocuments(organizationId: number, admin = false): Promise<StoredFile[]> {
    return firstValueFrom(
      this.http.get<StoredFile[]>(`${this.filesUrl(organizationId, admin)}/documents`),
    );
  }

  uploadDocument(organizationId: number, file: File, admin = false): Promise<StoredFile> {
    return firstValueFrom(
      this.http.post<StoredFile>(
        `${this.filesUrl(organizationId, admin)}/documents`,
        toFormData(file),
      ),
    );
  }

  deleteDocument(organizationId: number, fileId: number, admin = false): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.filesUrl(organizationId, admin)}/documents/${fileId}`),
    );
  }

  listDocumentsForReview(organizationId: number): Promise<StoredFile[]> {
    return firstValueFrom(
      this.http.get<StoredFile[]>(`${API_URL}/admin/organizations/${organizationId}/documents`),
    );
  }

  listMyOrganizations(): Promise<MyOrganization[]> {
    return firstValueFrom(this.http.get<MyOrganization[]>(`${this.baseUrl}/mine`));
  }

  listGovernorates(): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`${this.baseUrl}/governorates`));
  }

  createOrganization(value: OrganizationFormValue): Promise<MyOrganization> {
    return firstValueFrom(this.http.post<MyOrganization>(this.baseUrl, toBody(value)));
  }

  updateOrganization(id: number, value: OrganizationFormValue): Promise<Organization> {
    // The type is chosen at creation and cannot change; the backend ignores it on update.
    return firstValueFrom(this.http.put<Organization>(`${this.baseUrl}/${id}`, toBody(value)));
  }

  updateOrganizationSchedule(id: number, value: BookingScheduleValue): Promise<Organization> {
    return firstValueFrom(this.http.put<Organization>(`${this.baseUrl}/${id}/schedule`, value));
  }

  /** The team through /admin/organizations (any organization) or the member's own workspace. */
  private membersUrl(organizationId: number, admin: boolean): string {
    return admin
      ? `${API_URL}/admin/organizations/${organizationId}/members`
      : `${this.baseUrl}/${organizationId}/members`;
  }

  listUserMemberships(userId: number): Promise<UserMembership[]> {
    return firstValueFrom(
      this.http.get<UserMembership[]>(`${API_URL}/admin/users/${userId}/organizations`),
    );
  }

  listMembers(organizationId: number): Promise<Member[]> {
    return firstValueFrom(this.http.get<Member[]>(`${this.baseUrl}/${organizationId}/members`));
  }

  addMember(organizationId: number, value: AddMemberValue, admin = false): Promise<Member> {
    return firstValueFrom(this.http.post<Member>(this.membersUrl(organizationId, admin), value));
  }

  changeMemberRole(
    organizationId: number,
    memberId: number,
    roleKey: MemberRoleKey,
    admin = false,
  ): Promise<Member> {
    return firstValueFrom(
      this.http.put<Member>(`${this.membersUrl(organizationId, admin)}/${memberId}/role`, {
        roleKey,
      }),
    );
  }

  changeMemberStatus(
    organizationId: number,
    memberId: number,
    status: MemberStatus,
    admin = false,
  ): Promise<Member> {
    return firstValueFrom(
      this.http.put<Member>(`${this.membersUrl(organizationId, admin)}/${memberId}/status`, {
        status,
      }),
    );
  }

  removeMember(organizationId: number, memberId: number, admin = false): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.membersUrl(organizationId, admin)}/${memberId}`),
    );
  }

  searchOrganizations(
    status: OrganizationStatus | null,
    page: number,
    filters?: OrganizationSearchFilters,
    size = 20,
  ): Promise<Page<Organization>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) {
      params = params.set('status', status);
    }
    if (filters?.q.trim()) params = params.set('q', filters.q.trim());
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.governorate) params = params.set('governorate', filters.governorate);
    if (filters?.sort) params = params.set('sort', filters.sort);
    return firstValueFrom(
      this.http.get<Page<Organization>>(`${API_URL}/admin/organizations`, { params }),
    );
  }

  approveOrganization(id: number): Promise<Organization> {
    return firstValueFrom(
      this.http.post<Organization>(`${API_URL}/admin/organizations/${id}/approve`, null),
    );
  }

  /** Admin: opens an organization for an existing account, approved at once when asked. */
  adminCreateOrganization(
    ownerEmail: string,
    approve: boolean,
    value: OrganizationFormValue,
  ): Promise<Organization> {
    return firstValueFrom(
      this.http.post<Organization>(`${API_URL}/admin/organizations`, {
        ownerEmail,
        approve,
        organization: value,
      }),
    );
  }

  adminUpdateOrganization(id: number, value: OrganizationFormValue): Promise<Organization> {
    return firstValueFrom(
      this.http.put<Organization>(`${API_URL}/admin/organizations/${id}`, value),
    );
  }

  adminGetOrganization(id: number): Promise<Organization> {
    return firstValueFrom(this.http.get<Organization>(`${API_URL}/admin/organizations/${id}`));
  }

  adminListMembers(id: number): Promise<Member[]> {
    return firstValueFrom(this.http.get<Member[]>(`${API_URL}/admin/organizations/${id}/members`));
  }

  suspendOrganization(id: number): Promise<Organization> {
    return firstValueFrom(
      this.http.post<Organization>(`${API_URL}/admin/organizations/${id}/suspend`, null),
    );
  }
}
