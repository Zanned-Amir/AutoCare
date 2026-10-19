import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { AutoService, AutoServiceSearchParams } from './catalog.types';
import { AutoServiceFormValue } from './catalog.schema';

/** No icon chosen is sent as null (the API only takes a real icon key). */
function toBody(value: AutoServiceFormValue) {
  return { ...value, icon: value.icon || null };
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);

  listActiveAutoServices(): Promise<AutoService[]> {
    return firstValueFrom(this.http.get<AutoService[]>(`${API_URL}/catalog/services`));
  }

  searchAutoServices({
    q,
    page,
    size,
    active,
    sort,
  }: AutoServiceSearchParams): Promise<Page<AutoService>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    if (active !== undefined && active !== null) params = params.set('active', active);
    if (sort) params = params.set('sort', sort);
    return firstValueFrom(
      this.http.get<Page<AutoService>>(`${API_URL}/admin/catalog/services`, { params }),
    );
  }

  createAutoService(value: AutoServiceFormValue): Promise<AutoService> {
    return firstValueFrom(
      this.http.post<AutoService>(`${API_URL}/admin/catalog/services`, toBody(value)),
    );
  }

  /** Hidden from the catalog and new requests; providers keep it and running requests go on. */
  setAutoServiceActive(id: number, active: boolean): Promise<AutoService> {
    return firstValueFrom(
      this.http.post<AutoService>(
        `${API_URL}/admin/catalog/services/${id}/${active ? 'reactivate' : 'deactivate'}`,
        null,
      ),
    );
  }

  updateAutoService(id: number, value: AutoServiceFormValue): Promise<AutoService> {
    return firstValueFrom(
      this.http.put<AutoService>(`${API_URL}/admin/catalog/services/${id}`, toBody(value)),
    );
  }
}
