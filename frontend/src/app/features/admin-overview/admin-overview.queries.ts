import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { AuthStore } from '@core/auth/auth.store';
import { CatalogApi } from '@features/catalog/catalog.api';
import { CatalogPermissions } from '@features/catalog/catalog.permissions';
import { HelpdeskApi } from '@features/helpdesk/helpdesk.api';
import { HelpdeskPermissions } from '@features/helpdesk/helpdesk.types';
import { OrganizationsApi } from '@features/organizations/organizations.api';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { injectAdminRequestStatsQuery } from '@features/service-requests/service-requests.queries';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { UsersApi } from '@features/users/users.api';
import { UserPermissions } from '@features/users/users.permissions';

/**
 * Admin dashboard figures, read from the sections' own endpoints. Each query only runs when
 * the staff member may open that section, so a support agent never triggers a 403.
 */
export function injectAdminOverviewQueries() {
  const auth = inject(AuthStore);
  const organizations = inject(OrganizationsApi);
  const users = inject(UsersApi);
  const helpdesk = inject(HelpdeskApi);
  const catalog = inject(CatalogApi);

  const can = {
    organizations: () => auth.can(OrganizationPermissions.ORGANIZATION_APPROVE),
    users: () => auth.can(UserPermissions.USER_READ),
    helpdesk: () => auth.can(HelpdeskPermissions.TICKET_MANAGE),
    catalog: () => auth.can(CatalogPermissions.SERVICE_READ),
    requests: () => auth.can(ServiceRequestPermissions.REQUEST_READ),
  };

  return {
    can,
    requestStats: injectAdminRequestStatsQuery(() => can.requests()),
    pendingOrganizations: injectQuery(() => ({
      queryKey: ['organizations', 'admin', 'PENDING', 0] as const,
      queryFn: () => organizations.searchOrganizations('PENDING', 0),
      enabled: can.organizations(),
    })),
    approvedOrganizations: injectQuery(() => ({
      queryKey: ['organizations', 'admin', 'APPROVED', 0] as const,
      queryFn: () => organizations.searchOrganizations('APPROVED', 0),
      enabled: can.organizations(),
    })),
    users: injectQuery(() => ({
      queryKey: ['admin-users', 'search', '', 0] as const,
      queryFn: () => users.searchUsers({ q: '', role: null, active: null, sort: '', page: 0 }),
      enabled: can.users(),
    })),
    helpdeskStats: injectQuery(() => ({
      queryKey: ['helpdesk', 'stats'] as const,
      queryFn: () => helpdesk.stats(),
      enabled: can.helpdesk(),
    })),
    unassignedTickets: injectQuery(() => ({
      queryKey: ['helpdesk', 'overview', 'unassigned'] as const,
      queryFn: () =>
        helpdesk.searchTickets({
          status: null,
          priority: null,
          assignee: 'unassigned',
          q: '',
          page: 0,
        }),
      enabled: can.helpdesk(),
    })),
    services: injectQuery(() => ({
      queryKey: ['catalog', 'overview'] as const,
      queryFn: () => catalog.searchAutoServices({ q: '', page: 0, size: 1 }),
      enabled: can.catalog(),
    })),
  };
}
