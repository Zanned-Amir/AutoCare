import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { ApiCapability, ApiKey, ApiKeyUsage, NewApiKey } from './api-keys.types';

@Injectable({ providedIn: 'root' })
export class ApiKeysApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin/api-keys`;

  capabilities(): Promise<ApiCapability[]> {
    return firstValueFrom(this.http.get<ApiCapability[]>(`${this.base}/capabilities`));
  }
  list(): Promise<Page<ApiKey>> {
    return firstValueFrom(this.http.get<Page<ApiKey>>(this.base));
  }
  usage(id: number): Promise<ApiKeyUsage[]> {
    return firstValueFrom(this.http.get<ApiKeyUsage[]>(`${this.base}/${id}/usage`));
  }
  create(value: NewApiKey): Promise<{ apiKey: ApiKey; key: string }> {
    return firstValueFrom(this.http.post<{ apiKey: ApiKey; key: string }>(this.base, value));
  }
  setStatus(id: number, status: 'ACTIVE' | 'DISABLED'): Promise<ApiKey> {
    return firstValueFrom(this.http.patch<ApiKey>(`${this.base}/${id}/status`, { status }));
  }
  rotate(id: number): Promise<{ apiKey: ApiKey; key: string }> {
    return firstValueFrom(
      this.http.post<{ apiKey: ApiKey; key: string }>(`${this.base}/${id}/rotate`, null),
    );
  }
  revoke(id: number, reason: string): Promise<ApiKey> {
    return firstValueFrom(this.http.post<ApiKey>(`${this.base}/${id}/revoke`, { reason }));
  }
}
