import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { AuditLog, AuditTargetType } from './audit.types';

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly http = inject(HttpClient);

  searchAuditLogs(
    targetType: AuditTargetType,
    targetId: number,
    page: number,
  ): Promise<Page<AuditLog>> {
    const params = new HttpParams()
      .set('targetType', targetType)
      .set('targetId', targetId)
      .set('page', page)
      .set('size', 10);
    return firstValueFrom(this.http.get<Page<AuditLog>>(`${API_URL}/admin/audit-logs`, { params }));
  }
}
