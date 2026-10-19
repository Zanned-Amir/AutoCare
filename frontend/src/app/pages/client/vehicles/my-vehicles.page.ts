import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AuthStore } from '@core/auth/auth.store';
import { VehicleCard } from '@features/vehicles/components/vehicle-card';
import { VehicleForm } from '@features/vehicles/components/vehicle-form';
import { VehiclePermissions } from '@features/vehicles/vehicles.permissions';
import { injectMyVehiclesQuery } from '@features/vehicles/vehicles.queries';
import { Vehicle } from '@features/vehicles/vehicles.types';
import { Button, Card, EmptyState, Spinner } from '@shared/ui';

@Component({
  selector: 'app-my-vehicles-page',
  imports: [Button, Card, EmptyState, Spinner, VehicleCard, VehicleForm],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span class="text-overline text-accent-text">Mon garage</span>
        <h1 class="text-h2 text-primary">Mes véhicules</h1>
      </div>
      @if (auth.can(permissions.VEHICLE_CREATE) && editing() === null) {
        <button appButton type="button" (click)="editing.set('new')">Ajouter un véhicule</button>
      }
    </div>

    @if (editing(); as current) {
      <app-card class="mt-6">
        <h2 class="mb-4 text-h4">
          {{ current === 'new' ? 'Nouveau véhicule' : 'Modifier le véhicule' }}
        </h2>
        <app-vehicle-form
          [vehicle]="current === 'new' ? null : current"
          (saved)="editing.set(null)"
          (cancelled)="editing.set(null)"
        />
      </app-card>
    }

    <section class="mt-6">
      @if (vehicles.isPending()) {
        <app-spinner />
      } @else if (vehicles.isError()) {
        <p class="text-body-sm text-error">Impossible de charger vos véhicules.</p>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (vehicle of vehicles.data(); track vehicle.id) {
            <app-vehicle-card [vehicle]="vehicle" (edit)="editing.set($event)" />
          } @empty {
            <app-card class="sm:col-span-2 lg:col-span-3">
              <app-empty-state
                image="empty-vehicles"
                title="Aucun véhicule pour l'instant"
                description="Ajoutez votre voiture pour lancer un diagnostic, demander un service et suivre son entretien."
              >
                @if (auth.can(permissions.VEHICLE_CREATE)) {
                  <button appButton type="button" (click)="editing.set('new')">
                    Ajouter un véhicule
                  </button>
                }
              </app-empty-state>
            </app-card>
          }
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyVehiclesPage {
  protected readonly auth = inject(AuthStore);
  protected readonly permissions = VehiclePermissions;
  protected readonly vehicles = injectMyVehiclesQuery();
  protected readonly editing = signal<Vehicle | 'new' | null>(null);
}
