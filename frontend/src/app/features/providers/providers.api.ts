import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { ProviderServiceFormValue, toPriceBody } from './providers.schema';
import {
  GovernorateLocation,
  ProviderSearchParams,
  ProviderSearchResult,
  ProviderService,
} from './providers.types';

@Injectable({ providedIn: 'root' })
export class ProvidersApi {
  private readonly http = inject(HttpClient);

  searchProviders({
    q,
    serviceId,
    governorate,
    atHome,
    page,
    near,
    size,
  }: ProviderSearchParams): Promise<Page<ProviderSearchResult>> {
    let params = new HttpParams().set('page', page).set('size', size ?? 12);
    if (near) {
      params = params.set('lat', near.latitude).set('lng', near.longitude);
      if (near.radiusKm !== null) params = params.set('radiusKm', near.radiusKm);
    }
    if (q.trim()) params = params.set('q', q.trim());
    if (serviceId !== null) params = params.set('serviceId', serviceId);
    if (governorate) params = params.set('governorate', governorate);
    if (atHome) params = params.set('atHome', true);
    return firstValueFrom(
      this.http.get<Page<ProviderSearchResult>>(`${API_URL}/providers`, { params }),
    );
  }

  listGovernorateLocations(): Promise<GovernorateLocation[]> {
    return firstValueFrom(
      this.http.get<GovernorateLocation[]>(`${API_URL}/providers/governorates`),
    );
  }

  getProviderProfile(organizationId: number): Promise<ProviderSearchResult> {
    return firstValueFrom(
      this.http.get<ProviderSearchResult>(`${API_URL}/providers/${organizationId}`),
    );
  }

  /** Backoffice organization page. */
  listOrganizationServicesAdmin(organizationId: number): Promise<ProviderService[]> {
    return firstValueFrom(
      this.http.get<ProviderService[]>(`${API_URL}/admin/organizations/${organizationId}/services`),
    );
  }

  /** Catalog service id (as a string key) to the number of organizations offering it. */
  countProvidersByService(): Promise<Record<string, number>> {
    return firstValueFrom(
      this.http.get<Record<string, number>>(`${API_URL}/admin/catalog/services/provider-counts`),
    );
  }

  listProviderServices(organizationId: number): Promise<ProviderService[]> {
    return firstValueFrom(
      this.http.get<ProviderService[]>(`${API_URL}/organizations/${organizationId}/services`),
    );
  }

  offerProviderService(
    organizationId: number,
    value: ProviderServiceFormValue,
  ): Promise<ProviderService> {
    return firstValueFrom(
      this.http.post<ProviderService>(`${API_URL}/organizations/${organizationId}/services`, {
        serviceId: Number(value.serviceId),
        atHome: value.atHome,
        indicativePrice: toPriceBody(value.indicativePrice),
      }),
    );
  }

  updateProviderService(
    organizationId: number,
    id: number,
    value: ProviderServiceFormValue,
  ): Promise<ProviderService> {
    return firstValueFrom(
      this.http.put<ProviderService>(`${API_URL}/organizations/${organizationId}/services/${id}`, {
        atHome: value.atHome,
        indicativePrice: toPriceBody(value.indicativePrice),
      }),
    );
  }

  removeProviderService(organizationId: number, id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${API_URL}/organizations/${organizationId}/services/${id}`),
    );
  }
}
