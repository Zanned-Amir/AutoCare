import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ProviderServicesPanel } from '@features/providers/components/provider-services-panel';
import { ProContext } from '@layouts/pro/pro-context';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

@Component({
  selector: 'app-pro-services-page',
  imports: [AdminPageHeader, ProviderServicesPanel],
  template: `
    <app-admin-page-header
      title="Services et tarifs"
      subtitle="Les services que vous proposez et leurs prix indicatifs."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <app-provider-services-panel [organizationId]="id()" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProServicesPage {
  protected readonly context = inject(ProContext);
  protected readonly id = computed(() => this.context.organizationId());
}
