import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthStore } from '@core/auth/auth.store';
import { BookingScheduleForm } from '@features/organizations/components/booking-schedule-form';
import { OrganizationFilesPanel } from '@features/organizations/components/organization-files-panel';
import { OrganizationForm } from '@features/organizations/components/organization-form';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { Card } from '@shared/ui';
import { ProContext } from '@layouts/pro/pro-context';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

@Component({
  selector: 'app-pro-profile-page',
  imports: [AdminPageHeader, BookingScheduleForm, Card, OrganizationFilesPanel, OrganizationForm],
  template: `
    <app-admin-page-header
      title="Profil et carte"
      subtitle="Ce que les clients voient : coordonnées, horaires, position sur la carte et documents."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (context.organization(); as organization) {
        <div class="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <app-card>
            <h2 class="mb-4 text-h4">Profil public</h2>
            @if (auth.canInOrganization(permissions.ORGANIZATION_UPDATE)) {
              <app-organization-form [organization]="organization" [showCancel]="false" />
            } @else {
              <p class="text-body-sm text-foreground-secondary">
                {{ organization.phone }} · {{ organization.city }}, {{ organization.governorate }}
              </p>
            }
          </app-card>
          @if (auth.canInOrganization(permissions.ORGANIZATION_UPDATE)) {
            <div class="flex h-fit flex-col gap-6">
              @if (organization.type === 'PROVIDER') {
                <app-booking-schedule-form [organization]="organization" />
              }
              <app-organization-files-panel [organizationId]="organization.id" />
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProProfilePage {
  protected readonly context = inject(ProContext);
  protected readonly id = computed(() => this.context.organizationId());
  protected readonly auth = inject(AuthStore);
  protected readonly permissions = OrganizationPermissions;
}
