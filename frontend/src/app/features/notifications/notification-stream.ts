import { Injectable, inject } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';

import { API_URL } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { SessionService } from '@core/auth/session.service';
import { requestKeys } from '@features/service-requests/service-requests.queries';
import { notificationKeys } from './notifications.queries';

/**
 * Reads the server-sent events of /notifications/stream with fetch(), because EventSource
 * cannot send the Authorization header. Each "unread" event updates the badge and reloads
 * the list. Reconnects after a drop; refreshes the session on 401.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStream {
  private readonly auth = inject(AuthStore);
  private readonly session = inject(SessionService);
  private readonly queryClient = inject(QueryClient);
  private controller: AbortController | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this.controller) return;
    this.controller = new AbortController();
    void this.connect(this.controller);
  }

  stop(): void {
    this.controller?.abort();
    this.controller = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private async connect(controller: AbortController): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/notifications/stream`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken()}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      });
      if (response.status === 401 && (await this.session.refreshSession())) {
        return this.retry(controller, 0);
      }
      if (!response.ok || !response.body) return this.retry(controller, 30_000);
      await this.read(response.body);
      this.retry(controller, 2_000);
    } catch {
      if (!controller.signal.aborted) this.retry(controller, 10_000);
    }
  }

  private async read(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        this.handle(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
      }
    }
  }

  private handle(block: string): void {
    const lines = block.split('\n');
    const event = lines
      .find((line) => line.startsWith('event:'))
      ?.slice(6)
      .trim();
    const data = lines
      .find((line) => line.startsWith('data:'))
      ?.slice(5)
      .trim();
    if (event !== 'unread' || !data) return;
    const { count } = JSON.parse(data) as { count: number };
    const previous = this.queryClient.getQueryData<{ count: number }>(notificationKeys.unread());
    this.queryClient.setQueryData(notificationKeys.unread(), { count });
    if (previous?.count !== count) {
      void this.queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      // Most notifications are about a request: refresh the one on screen too.
      void this.queryClient.invalidateQueries({ queryKey: requestKeys.all });
    }
  }

  private retry(controller: AbortController, delay: number): void {
    if (controller.signal.aborted || !this.auth.isAuthenticated()) {
      this.stop();
      return;
    }
    this.retryTimer = setTimeout(() => void this.connect(controller), delay);
  }
}
