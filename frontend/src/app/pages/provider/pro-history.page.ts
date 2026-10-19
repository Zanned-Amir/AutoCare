import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import {
  injectOrganizationRecordsQuery,
  injectUpdateReportMutation,
} from '@features/maintenance/maintenance.queries';
import { MaintenanceRecord } from '@features/maintenance/maintenance.types';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { ProContext } from '@layouts/pro/pro-context';
import { Button, Card, Spinner, inputClasses } from '@shared/ui';
import { formatNumber } from '@shared/utils/number';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

/** Work reports written by this organization; the report can be completed afterwards. */
@Component({
  selector: 'app-pro-history-page',
  imports: [AdminPageHeader, Button, Card, Spinner],
  template: `
    <app-admin-page-header
      title="Interventions"
      subtitle="Les travaux réalisés pour vos clients, véhicule par véhicule."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <app-card class="p-0">
        @if (records.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else {
          <ul class="divide-y divide-border-subtle">
            @for (record of records.data()?.content ?? []; track record.id) {
              <li class="px-4 py-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="text-label text-foreground">{{ record.description }}</p>
                    <p class="text-caption text-foreground-muted">
                      {{ format(record.date) }} ·
                      <span class="text-plate">{{ formatNumber(record.mileage) }} km</span>
                    </p>
                  </div>
                  @if (canEdit() && editing() !== record.id) {
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="edit(record)"
                    >
                      Compléter le rapport
                    </button>
                  }
                </div>
                @if (editing() === record.id) {
                  <div class="mt-3 grid gap-2">
                    <textarea
                      [class]="inputClasses + ' h-20 py-2'"
                      placeholder="Travaux réalisés"
                      [value]="result()"
                      (input)="result.set($any($event.target).value)"
                    ></textarea>
                    <input
                      [class]="inputClasses"
                      placeholder="Recommandations"
                      [value]="advice()"
                      (input)="advice.set($any($event.target).value)"
                    />
                    @if (error(); as message) {
                      <p class="text-body-sm text-error">{{ message }}</p>
                    }
                    <div class="flex justify-end gap-2">
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="editing.set(null)"
                      >
                        Annuler
                      </button>
                      <button
                        appButton
                        size="sm"
                        type="button"
                        [disabled]="update.isPending()"
                        (click)="save(record)"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                } @else {
                  @if (record.result; as result) {
                    <p class="mt-2 whitespace-pre-line text-body-sm text-foreground-secondary">
                      {{ result }}
                    </p>
                  }
                  @if (record.recommendations; as advice) {
                    <p
                      class="mt-2 rounded-control bg-warning-subtle px-3 py-2 text-body-sm text-warning"
                    >
                      À prévoir : {{ advice }}
                    </p>
                  }
                }
              </li>
            } @empty {
              <li class="px-4 py-10 text-center text-body-sm text-foreground-muted">
                Les interventions terminées apparaîtront ici avec leur rapport.
              </li>
            }
          </ul>
        }
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProHistoryPage {
  private readonly context = inject(ProContext);
  private readonly auth = inject(AuthStore);
  private readonly id = computed(() => this.context.organizationId());
  protected readonly records = injectOrganizationRecordsQuery(
    () => this.id(),
    () => 0,
  );
  protected readonly update = injectUpdateReportMutation(() => this.id());
  protected readonly canEdit = computed(() => {
    this.auth.organizationPermissions();
    return this.auth.canInOrganization(ServiceRequestPermissions.REQUEST_UPDATE_STATUS);
  });
  protected readonly inputClasses = inputClasses;
  protected readonly formatNumber = formatNumber;
  protected readonly editing = signal<number | null>(null);
  protected readonly result = signal('');
  protected readonly advice = signal('');
  protected readonly error = signal<string | null>(null);

  protected edit(record: MaintenanceRecord): void {
    this.result.set(record.result ?? '');
    this.advice.set(record.recommendations ?? '');
    this.error.set(null);
    this.editing.set(record.id);
  }

  protected save(record: MaintenanceRecord): void {
    this.update.mutate(
      {
        recordId: record.id,
        result: this.result().trim() || null,
        recommendations: this.advice().trim() || null,
      },
      {
        onSuccess: () => this.editing.set(null),
        onError: (e) => this.error.set(problemMessage(e, 'Enregistrement impossible')),
      },
    );
  }

  protected format(value: string): string {
    return dateFormat.format(new Date(value + 'T00:00:00'));
  }
}
