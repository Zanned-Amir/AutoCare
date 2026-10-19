import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { cn } from '@shared/utils/cn';
import { NotificationStream } from '../notification-stream';
import {
  injectNotificationMutations,
  injectNotificationsQuery,
  injectUnreadCountQuery,
} from '../notifications.queries';
import { AppNotification, notificationLink } from '../notifications.types';

const timeFormat = new Intl.DateTimeFormat('fr-TN', {
  dateStyle: 'short',
  timeStyle: 'short',
  hourCycle: 'h23',
});

@Component({
  selector: 'app-notification-bell',
  template: `
    <div class="relative">
      <button
        type="button"
        class="relative grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-background-subtle"
        [attr.aria-expanded]="open()"
        aria-label="Notifications"
        (click)="open.set(!open())"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        @if (count() > 0) {
          <span
            class="pointer-events-none absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] leading-none font-semibold text-accent-foreground ring-2 ring-surface"
            >{{ count() > 99 ? '99+' : count() }}</span
          >
        }
      </button>
      @if (open()) {
        <div
          class="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-border-subtle bg-surface shadow-card"
        >
          <div class="flex items-center justify-between border-b border-border-subtle px-4 py-2">
            <span class="text-label">Notifications</span>
            @if (count() > 0) {
              <button
                type="button"
                class="text-caption text-primary hover:underline"
                (click)="mutations.markAllRead.mutate()"
              >
                Tout marquer comme lu
              </button>
            }
          </div>
          <ul class="max-h-96 divide-y divide-border-subtle overflow-y-auto">
            @for (notification of list.data()?.content ?? []; track notification.id) {
              <li [class]="itemClass(notification)">
                <button
                  type="button"
                  class="flex-1 text-left"
                  (click)="openNotification(notification)"
                >
                  <p class="text-label text-foreground">{{ notification.title }}</p>
                  <p class="text-body-sm text-foreground-secondary">{{ notification.body }}</p>
                  <p class="text-caption text-foreground-muted">
                    {{ format(notification.createdAt) }}
                  </p>
                </button>
                <button
                  type="button"
                  class="text-caption text-foreground-muted hover:text-foreground"
                  aria-label="Retirer"
                  (click)="mutations.dismiss.mutate(notification.id)"
                >
                  ✕
                </button>
              </li>
            } @empty {
              <li class="px-4 py-6 text-center text-body-sm text-foreground-muted">
                Rien de nouveau.
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
  private readonly auth = inject(AuthStore);
  private readonly stream = inject(NotificationStream);
  private readonly router = inject(Router);

  protected readonly open = signal(false);
  protected readonly unread = injectUnreadCountQuery(() => this.auth.isAuthenticated());
  protected readonly list = injectNotificationsQuery(
    () => this.auth.isAuthenticated() && this.open(),
  );
  protected readonly count = computed(() => this.unread.data()?.count ?? 0);
  protected readonly mutations = injectNotificationMutations();

  constructor() {
    effect(() => (this.auth.isAuthenticated() ? this.stream.start() : this.stream.stop()));
    inject(DestroyRef).onDestroy(() => this.stream.stop());
  }

  protected openNotification(notification: AppNotification): void {
    if (!notification.read) this.mutations.markRead.mutate(notification.id);
    const link = notificationLink(notification);
    this.open.set(false);
    if (link) void this.router.navigate(link);
  }

  protected format(value: string): string {
    return timeFormat.format(new Date(value));
  }

  protected itemClass(notification: AppNotification): string {
    return cn('flex items-start gap-2 px-4 py-3', notification.read ? '' : 'bg-primary-subtle/50');
  }
}
