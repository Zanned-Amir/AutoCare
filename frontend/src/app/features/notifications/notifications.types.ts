/** Mirrors the backend NotificationResponse. */
export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  resourceType: 'SERVICE_REQUEST' | 'ORGANIZATION' | string | null;
  resourceId: number | null;
  organizationId: number | null;
  read: boolean;
  createdAt: string;
}

/** Notifications a provider receives open the workspace; the others open the client's page. */
const PROVIDER_TYPES = new Set([
  'SERVICE_REQUEST_CREATED',
  'SERVICE_REQUEST_CANCELLED',
  'SERVICE_REQUEST_CLIENT_MESSAGE',
  'SERVICE_REQUEST_QUOTE_ACCEPTED',
  'ORGANIZATION_APPROVED',
]);

export function notificationLink(notification: AppNotification): string[] | null {
  if (PROVIDER_TYPES.has(notification.type) && notification.organizationId) {
    return ['/pro', String(notification.organizationId), 'requests'];
  }
  if (notification.resourceType === 'VEHICLE' && notification.resourceId) {
    return ['/vehicles', String(notification.resourceId)];
  }
  if (notification.resourceType === 'SERVICE_REQUEST' && notification.resourceId) {
    return ['/requests', String(notification.resourceId)];
  }
  return null;
}
