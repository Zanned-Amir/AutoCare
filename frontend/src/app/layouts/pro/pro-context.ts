import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { AuthStore } from '@core/auth/auth.store';
import { injectMyOrganizationsQuery } from '@features/organizations/organizations.queries';

/**
 * The organization the professional area is showing. Provided by ProLayout, read by its pages.
 * The membership's permissions drive canInOrganization() and the X-Organization-Id header.
 */
@Injectable()
export class ProContext {
  private readonly auth = inject(AuthStore);
  readonly organizationId = signal(0);
  readonly organizations = injectMyOrganizationsQuery();
  readonly membership = computed(() =>
    this.organizations.data()?.find((item) => item.organization.id === this.organizationId()),
  );
  readonly organization = computed(() => this.membership()?.organization ?? null);

  constructor() {
    effect(() => {
      const current = this.membership();
      if (current) this.auth.setActiveOrganization(current.organization.id, current.permissions);
    });
  }
}
