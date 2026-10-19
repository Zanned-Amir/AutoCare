import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MembersPanel } from '@features/organizations/components/members-panel';
import { ProContext } from '@layouts/pro/pro-context';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

@Component({
  selector: 'app-pro-team-page',
  imports: [AdminPageHeader, MembersPanel],
  template: `
    <app-admin-page-header
      title="Équipe"
      subtitle="Les personnes qui gèrent cet espace et leur rôle."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (context.organization(); as organization) {
        <div class="max-w-3xl"><app-members-panel [organization]="organization" /></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProTeamPage {
  protected readonly context = inject(ProContext);
  protected readonly id = computed(() => this.context.organizationId());
}
