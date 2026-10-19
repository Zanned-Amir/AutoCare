import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ProviderRequestsPanel } from '@features/service-requests/components/provider-requests-panel';
import { ProContext } from '@layouts/pro/pro-context';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

@Component({
  selector: 'app-pro-requests-page',
  imports: [AdminPageHeader, ProviderRequestsPanel],
  template: `
    <app-admin-page-header
      title="Demandes"
      subtitle="Les demandes de service de vos clients, à accepter et suivre."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <app-provider-requests-panel [organizationId]="id()" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProRequestsPage {
  protected readonly context = inject(ProContext);
  protected readonly id = computed(() => this.context.organizationId());
}
