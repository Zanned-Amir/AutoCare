import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MaintenanceReminders } from '@features/maintenance/components/maintenance-reminders';
import { MaintenanceTimeline } from '@features/maintenance/components/maintenance-timeline';
import { VehiclePhotosPanel } from '@features/vehicles/components/vehicle-photos-panel';
import { injectVehicleQuery } from '@features/vehicles/vehicles.queries';
import { fuelTypeLabels } from '@features/vehicles/vehicles.types';
import { Badge, Button, Card, Spinner } from '@shared/ui';
import { formatNumber } from '@shared/utils/number';

@Component({
  selector: 'app-vehicle-detail-page',
  imports: [
    Badge,
    Button,
    Card,
    MaintenanceReminders,
    MaintenanceTimeline,
    RouterLink,
    Spinner,
    VehiclePhotosPanel,
  ],
  template: `
    <a routerLink="/vehicles" class="text-body-sm text-primary hover:underline">← Mes véhicules</a>
    @if (vehicle.isPending()) {
      <div class="mt-6"><app-spinner /></div>
    } @else if (vehicle.data(); as current) {
      <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span class="text-overline text-accent-text"
            >{{ current.year }} · {{ fuelTypeLabels[current.fuelType] }}</span
          >
          <h1 class="text-h2 text-primary">{{ current.brand }} {{ current.model }}</h1>
          <p class="text-body-sm text-foreground-secondary">
            <span class="text-plate text-foreground">{{ formatNumber(current.mileage) }} km</span>
            @if (current.engine; as engine) {
              · {{ engine }}
            }
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a appButton variant="secondary" routerLink="/requests">Mes demandes</a>
          <a
            appButton
            variant="accent"
            routerLink="/diagnostic"
            [queryParams]="{ vehicleId: current.id }"
            >Lancer un diagnostic</a
          >
        </div>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <app-card
          ><app-maintenance-timeline [vehicleId]="current.id" [currentMileage]="current.mileage"
        /></app-card>
        <div class="flex h-fit flex-col gap-6">
          <app-card
            ><app-maintenance-reminders [vehicleId]="current.id" [currentMileage]="current.mileage"
          /></app-card>
          <app-card><app-vehicle-photos-panel [vehicleId]="current.id" /></app-card>
        </div>
      </div>
    } @else {
      <app-card class="mt-6">
        <h1 class="text-h4">Véhicule introuvable</h1>
        <app-badge tone="neutral">Il a peut-être été supprimé.</app-badge>
      </app-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDetailPage {
  /** Route param, bound by withComponentInputBinding(). */
  readonly vehicleId = input.required<string>();

  protected readonly vehicle = injectVehicleQuery(() => Number(this.vehicleId()));
  protected readonly fuelTypeLabels = fuelTypeLabels;
  protected readonly formatNumber = formatNumber;
}
