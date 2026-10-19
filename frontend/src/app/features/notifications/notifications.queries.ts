import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { NotificationsApi } from './notifications.api';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
};

/** The live stream keeps the count fresh; polling is the fallback when it is down. */
export function injectUnreadCountQuery(enabled: () => boolean) {
  const api = inject(NotificationsApi);
  return injectQuery(() => ({
    queryKey: notificationKeys.unread(),
    queryFn: () => api.unreadCount(),
    enabled: enabled(),
    refetchInterval: 120_000,
  }));
}

export function injectNotificationsQuery(enabled: () => boolean) {
  const api = inject(NotificationsApi);
  return injectQuery(() => ({
    queryKey: notificationKeys.list(),
    queryFn: () => api.list(0),
    enabled: enabled(),
  }));
}

export function injectNotificationMutations() {
  const api = inject(NotificationsApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  return {
    markRead: injectMutation(() => ({ mutationFn: (id: number) => api.markRead(id), onSuccess })),
    markAllRead: injectMutation(() => ({ mutationFn: () => api.markAllRead(), onSuccess })),
    dismiss: injectMutation(() => ({ mutationFn: (id: number) => api.dismiss(id), onSuccess })),
  };
}
