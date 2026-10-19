import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { AppNotification } from './notifications.types';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/notifications`;

  list(page: number): Promise<Page<AppNotification>> {
    return firstValueFrom(
      this.http.get<Page<AppNotification>>(this.base, { params: { page, size: 10 } }),
    );
  }
  unreadCount(): Promise<{ count: number }> {
    return firstValueFrom(this.http.get<{ count: number }>(`${this.base}/unread-count`));
  }
  markRead(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/${id}/read`, null));
  }
  markAllRead(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/read-all`, null));
  }
  dismiss(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}
