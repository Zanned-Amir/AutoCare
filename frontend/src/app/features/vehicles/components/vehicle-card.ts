import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { Badge, Button, Card } from '@shared/ui';
import { formatNumber } from '@shared/utils/number';
import { injectDeleteVehicleMutation } from '../vehicles.queries';
import { VehiclePermissions } from '../vehicles.permissions';
import { Vehicle, fuelTypeLabels } from '../vehicles.types';

@Component({
  selector: 'app-vehicle-card',
  imports: [Badge, Button, Card, RouterLink],
  template: `
    <app-card class="flex h-full flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-h4 text-foreground">{{ vehicle().brand }} {{ vehicle().model }}</h3>
          <p class="text-body-sm text-foreground-secondary">
            {{ vehicle().year }}
            @if (vehicle().engine; as engine) {
              · {{ engine }}
            }
          </p>
        </div>
        <app-badge tone="primary">{{ fuelTypeLabels[vehicle().fuelType] }}</app-badge>
      </div>

      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <span class="text-overline text-foreground-muted">Kilométrage</span>
          <p class="text-plate text-foreground">{{ formatNumber(vehicle().mileage) }} km</p>
        </div>
        @if (vehicle().plate; as plate) {
          <div>
            <span class="text-overline text-foreground-muted">Immatriculation</span>
            <p class="text-plate w-fit rounded-md border border-border-strong px-2 text-foreground">
              {{ plate }}
            </p>
          </div>
        }
      </div>

      <div class="mt-auto flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-3">
        @if (confirmingDelete()) {
          <span class="mr-auto self-center text-body-sm text-foreground-secondary"
            >Supprimer ce véhicule ?</span
          >
          <button
            appButton
            variant="ghost"
            size="sm"
            type="button"
            (click)="confirmingDelete.set(false)"
          >
            Non
          </button>
          <button
            appButton
            variant="danger"
            size="sm"
            type="button"
            [disabled]="deleteMutation.isPending()"
            (click)="deleteVehicle()"
          >
            Oui, supprimer
          </button>
        } @else {
          @if (auth.can(permissions.VEHICLE_DELETE)) {
            <button
              appButton
              variant="ghost"
              size="sm"
              type="button"
              (click)="confirmingDelete.set(true)"
            >
              Supprimer
            </button>
          }
          @if (auth.can(permissions.VEHICLE_UPDATE)) {
            <button
              appButton
              variant="secondary"
              size="sm"
              type="button"
              (click)="edit.emit(vehicle())"
            >
              Modifier
            </button>
          }
          <a appButton size="sm" [routerLink]="['/vehicles', vehicle().id]">Détails</a>
        }
      </div>
      @if (deleteMutation.isError()) {
        <p class="text-caption text-error">Suppression impossible, réessayez.</p>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class VehicleCard {
  readonly vehicle = input.required<Vehicle>();
  readonly edit = output<Vehicle>();

  protected readonly auth = inject(AuthStore);
  protected readonly permissions = VehiclePermissions;
  protected readonly fuelTypeLabels = fuelTypeLabels;
  protected readonly formatNumber = formatNumber;
  protected readonly confirmingDelete = signal(false);
  protected readonly deleteMutation = injectDeleteVehicleMutation();

  protected deleteVehicle(): void {
    this.deleteMutation.mutate(this.vehicle().id);
  }
}
