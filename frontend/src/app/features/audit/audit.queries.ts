import { inject } from '@angular/core';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';

import { AuthStore } from '@core/auth/auth.store';
import { AuditApi } from './audit.api';
import { AuditPermissions, AuditTargetType } from './audit.types';

export const auditKeys = {
  all: ['audit'] as const,
  target: (targetType: AuditTargetType, targetId: number, page: number) =>
    [...auditKeys.all, targetType, targetId, page] as const,
};

/**
 * Records are written just after the action's commit, so the trail refreshes on its own a
 * few seconds later. Off for staff without audit:read.
 */
export function injectAuditTrailQuery(
  target: () => { type: AuditTargetType; id: number; page: number },
) {
  const api = inject(AuditApi);
  const auth = inject(AuthStore);
  return injectQuery(() => ({
    queryKey: auditKeys.target(target().type, target().id, target().page),
    queryFn: () => api.searchAuditLogs(target().type, target().id, target().page),
    enabled: auth.can(AuditPermissions.AUDIT_READ),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  }));
}
