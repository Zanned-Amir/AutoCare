import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { ServiceRequestValue } from './service-requests.schema';
import {
  AdminRequestFilters,
  RequestStatus,
  ServiceRequest,
  OrganizationInsights,
  RequestMessage,
  ServiceRequestStats,
  Slot,
  StatusChange,
} from './service-requests.types';

export interface CompleteReport {
  mileage: number | null;
  result: string | null;
  recommendations: string | null;
}

@Injectable({ providedIn: 'root' })
export class ServiceRequestsApi {
  private readonly http = inject(HttpClient);
  private readonly mine = `${API_URL}/service-requests`;
  private readonly admin = `${API_URL}/admin/service-requests`;

  searchAdminRequests(filters: AdminRequestFilters): Promise<Page<ServiceRequest>> {
    let params = new HttpParams().set('page', filters.page).set('size', filters.size ?? 20);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.serviceIds?.length) params = params.set('serviceIds', filters.serviceIds.join(','));
    if (filters.organizationId !== null)
      params = params.set('organizationId', filters.organizationId);
    if (filters.userId !== null) params = params.set('userId', filters.userId);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return firstValueFrom(this.http.get<Page<ServiceRequest>>(this.admin, { params }));
  }

  getAdminRequestStats(): Promise<ServiceRequestStats> {
    return firstValueFrom(this.http.get<ServiceRequestStats>(`${this.admin}/stats`));
  }

  historyAdmin(id: number): Promise<StatusChange[]> {
    return firstValueFrom(this.http.get<StatusChange[]>(`${this.admin}/${id}/history`));
  }

  createRequest(
    organizationId: number,
    diagnosticId: number | null,
    value: ServiceRequestValue,
  ): Promise<ServiceRequest> {
    return firstValueFrom(
      this.http.post<ServiceRequest>(this.mine, {
        organizationId,
        diagnosticId,
        vehicleId: Number(value.vehicleId),
        serviceId: Number(value.serviceId),
        locationType: value.locationType,
        location: value.locationType === 'HOME' ? value.location.trim() : null,
        desiredDate: value.desiredDate,
        desiredTime: value.desiredTime || null,
        note: value.note.trim() || null,
      }),
    );
  }
  listMine(status: RequestStatus | null, page: number): Promise<Page<ServiceRequest>> {
    return firstValueFrom(
      this.http.get<Page<ServiceRequest>>(this.mine, { params: params(status, page) }),
    );
  }
  getMine(id: number): Promise<ServiceRequest> {
    return firstValueFrom(this.http.get<ServiceRequest>(`${this.mine}/${id}`));
  }
  historyMine(id: number): Promise<StatusChange[]> {
    return firstValueFrom(this.http.get<StatusChange[]>(`${this.mine}/${id}/history`));
  }
  /** Free and full times of a provider on a day (public). */
  listSlots(organizationId: number, date: string): Promise<Slot[]> {
    return firstValueFrom(
      this.http.get<Slot[]>(`${API_URL}/providers/${organizationId}/slots`, {
        params: new HttpParams().set('date', date),
      }),
    );
  }

  acceptQuote(id: number): Promise<ServiceRequest> {
    return firstValueFrom(this.http.post<ServiceRequest>(`${this.mine}/${id}/quote/accept`, null));
  }

  declineQuote(id: number): Promise<ServiceRequest> {
    return firstValueFrom(this.http.post<ServiceRequest>(`${this.mine}/${id}/quote/decline`, null));
  }

  cancel(id: number, reason: string): Promise<ServiceRequest> {
    return firstValueFrom(
      this.http.post<ServiceRequest>(`${this.mine}/${id}/cancel`, {
        reason: reason.trim() || null,
      }),
    );
  }

  /** The chat of a request: the client's side when `organizationId` is null. */
  listMessages(organizationId: number | null, id: number): Promise<RequestMessage[]> {
    return firstValueFrom(this.http.get<RequestMessage[]>(this.messagesUrl(organizationId, id)));
  }

  postMessage(organizationId: number | null, id: number, body: string): Promise<RequestMessage> {
    return firstValueFrom(
      this.http.post<RequestMessage>(this.messagesUrl(organizationId, id), { body }),
    );
  }

  private messagesUrl(organizationId: number | null, id: number): string {
    return organizationId === null
      ? `${this.mine}/${id}/messages`
      : `${this.org(organizationId)}/${id}/messages`;
  }

  // Provider
  listForOrganization(
    organizationId: number,
    status: RequestStatus | null,
    page: number,
  ): Promise<Page<ServiceRequest>> {
    return firstValueFrom(
      this.http.get<Page<ServiceRequest>>(this.org(organizationId), {
        params: params(status, page),
      }),
    );
  }
  insightsForOrganization(organizationId: number, weeks: number): Promise<OrganizationInsights> {
    return firstValueFrom(
      this.http.get<OrganizationInsights>(`${this.org(organizationId)}/insights`, {
        params: new HttpParams().set('weeks', weeks),
      }),
    );
  }
  countForOrganization(organizationId: number): Promise<Record<RequestStatus, number>> {
    return firstValueFrom(
      this.http.get<Record<RequestStatus, number>>(`${this.org(organizationId)}/counts`),
    );
  }
  act(organizationId: number, id: number, action: 'confirm' | 'start'): Promise<ServiceRequest> {
    return firstValueFrom(
      this.http.post<ServiceRequest>(`${this.org(organizationId)}/${id}/${action}`, null),
    );
  }
  /** `amount` is a decimal string such as "120.500". */
  sendQuote(
    organizationId: number,
    id: number,
    amount: string,
    note: string,
  ): Promise<ServiceRequest> {
    return firstValueFrom(
      this.http.post<ServiceRequest>(`${this.org(organizationId)}/${id}/quote`, {
        amount,
        note: note.trim() || null,
      }),
    );
  }

  reject(organizationId: number, id: number, reason: string): Promise<ServiceRequest> {
    return firstValueFrom(
      this.http.post<ServiceRequest>(`${this.org(organizationId)}/${id}/reject`, { reason }),
    );
  }
  complete(organizationId: number, id: number, report: CompleteReport): Promise<ServiceRequest> {
    return firstValueFrom(
      this.http.post<ServiceRequest>(`${this.org(organizationId)}/${id}/complete`, report),
    );
  }

  /** Requests whose desired day is between the two dates (yyyy-MM-dd, at most 62 days). */
  calendar(organizationId: number, from: string, to: string): Promise<ServiceRequest[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return firstValueFrom(
      this.http.get<ServiceRequest[]>(`${this.org(organizationId)}/calendar`, { params }),
    );
  }

  private org(organizationId: number): string {
    return `${API_URL}/organizations/${organizationId}/service-requests`;
  }
}

function params(status: RequestStatus | null, page: number): HttpParams {
  let result = new HttpParams().set('page', page);
  if (status) result = result.set('status', status);
  return result;
}
