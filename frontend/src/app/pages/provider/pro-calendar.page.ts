import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { RequestCalendar } from '@features/service-requests/components/request-calendar';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { ProContext } from '@layouts/pro/pro-context';

@Component({
  selector: 'app-pro-calendar-page',
  imports: [AdminPageHeader, RequestCalendar],
  template: `
    <app-admin-page-header
      title="Agenda"
      subtitle="Vos rendez-vous et demandes par jour : ce qui arrive, ce qui est en cours."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <app-request-calendar [organizationId]="id()" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProCalendarPage {
  private readonly context = inject(ProContext);
  protected readonly id = computed(() => this.context.organizationId());
}
