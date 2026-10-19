import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { Badge, Button, Spinner } from '@shared/ui';
import { formatNumber } from '@shared/utils/number';
import { injectMaintenanceMutations, injectVehicleHistoryQuery } from '../maintenance.queries';
import { MaintenanceRecord } from '../maintenance.types';
import { MaintenanceRecordForm } from './maintenance-record-form';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'long' });

@Component({
  selector: 'app-maintenance-timeline',
  imports: [Badge, Button, MaintenanceRecordForm, Spinner],
  template: `
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-h4">Historique d'entretien</h2>
      @if (editing() === null) {
        <button appButton variant="secondary" size="sm" type="button" (click)="editing.set('new')">
          Ajouter une entrée
        </button>
      }
    </div>

    @if (editing(); as current) {
      <div class="mt-4 rounded-card border border-border-subtle p-4">
        <app-maintenance-record-form
          [vehicleId]="vehicleId()"
          [currentMileage]="currentMileage()"
          [record]="current === 'new' ? null : current"
          (saved)="editing.set(null)"
          (cancelled)="editing.set(null)"
        />
      </div>
    }

    @if (history.isPending()) {
      <div class="mt-4"><app-spinner /></div>
    } @else {
      <ol class="mt-4 flex flex-col gap-4 border-l-2 border-border-subtle pl-5">
        @for (record of history.data() ?? []; track record.id) {
          <li class="relative">
            <span
              class="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-surface bg-primary"
            ></span>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-label text-foreground">{{ record.description }}</span>
              @if (record.source === 'SERVICE_REQUEST') {
                <app-badge tone="success"
                  >Fait par {{ record.organization?.name ?? 'un prestataire' }}</app-badge
                >
              } @else {
                <app-badge>Ajouté par vous</app-badge>
              }
            </div>
            <p class="text-caption text-foreground-muted">
              {{ formatDate(record.date) }} ·
              <span class="text-plate">{{ formatNumber(record.mileage) }} km</span>
            </p>
            @if (record.result; as result) {
              <p class="mt-1 whitespace-pre-line text-body-sm text-foreground-secondary">
                {{ result }}
              </p>
            }
            @if (record.recommendations; as advice) {
              <p class="mt-1 rounded-control bg-warning-subtle px-3 py-2 text-body-sm text-warning">
                À prévoir : {{ advice }}
              </p>
            }
            @if (record.editable) {
              <div class="mt-1 flex gap-2">
                <button
                  appButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  (click)="editing.set(record)"
                >
                  Modifier
                </button>
                <button
                  appButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  [disabled]="mutations.remove.isPending()"
                  (click)="mutations.remove.mutate(record.id)"
                >
                  Supprimer
                </button>
              </div>
            }
          </li>
        } @empty {
          <li class="text-body-sm text-foreground-muted">
            Rien pour l'instant. Les interventions faites via AutoCare s'ajoutent toutes seules.
          </li>
        }
      </ol>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceTimeline {
  readonly vehicleId = input.required<number>();
  readonly currentMileage = input(0);

  protected readonly history = injectVehicleHistoryQuery(() => this.vehicleId());
  protected readonly mutations = injectMaintenanceMutations(() => this.vehicleId());
  protected readonly editing = signal<MaintenanceRecord | 'new' | null>(null);
  protected readonly formatNumber = formatNumber;

  protected formatDate(value: string): string {
    return dateFormat.format(new Date(value + 'T00:00:00'));
  }
}
