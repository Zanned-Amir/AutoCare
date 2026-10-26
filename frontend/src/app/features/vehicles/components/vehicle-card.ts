import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { Badge, Button, Card, Icon } from '@shared/ui';
import { formatNumber } from '@shared/utils/number';
import { injectDeleteVehicleMutation, injectVehiclePhotosQuery } from '../vehicles.queries';
import { VehiclePermissions } from '../vehicles.permissions';
import { Vehicle, fuelTypeLabels } from '../vehicles.types';

@Component({
  selector: 'app-vehicle-card',
  imports: [Badge, Button, Card, Icon, RouterLink],
  template: `
    <app-card class="flex h-full flex-col gap-3">
      <div
        class="relative aspect-[16/10] overflow-hidden rounded-lg bg-foreground/5"
        (mouseenter)="hoverPaused.set(true)"
        (mouseleave)="hoverPaused.set(false)"
      >
        @if (photosQuery.isPending()) {
          <div class="h-full w-full animate-pulse bg-foreground/10"></div>
        } @else if (photos().length === 0) {
          <div class="flex h-full items-center justify-center text-foreground-muted">
            <svg appIcon name="car" class="size-12"></svg>
          </div>
        } @else {
          @for (photo of photos(); track photo.id; let i = $index) {
            <img
              [src]="photo.url"
              [alt]="vehicle().brand + ' ' + vehicle().model"
              class="absolute inset-0 size-full object-cover motion-safe:transition-opacity motion-safe:duration-700"
              [class.opacity-100]="i === activeIndex()"
              [class.opacity-0]="i !== activeIndex()"
              [attr.loading]="i === 0 ? 'eager' : 'lazy'"
              decoding="async"
            />
          }
          @if (photos().length > 1) {
            <div class="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              @for (photo of photos(); track photo.id; let i = $index) {
                <button
                  type="button"
                  class="h-1.5 rounded-full bg-white/50 transition-all hover:bg-white"
                  [class.w-6]="i === activeIndex()"
                  [class.bg-white]="i === activeIndex()"
                  [class.w-1.5]="i !== activeIndex()"
                  [attr.aria-label]="'Photo ' + (i + 1) + ' sur ' + photos().length"
                  [attr.aria-current]="i === activeIndex()"
                  (click)="activeIndex.set(i)"
                ></button>
              }
            </div>
          }
        }
      </div>

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

  protected readonly photosQuery = injectVehiclePhotosQuery(() => this.vehicle().id);
  protected readonly photos = computed(() => this.photosQuery.data() ?? []);
  /** Back to the first photo whenever the card shows another vehicle. */
  protected readonly activeIndex = linkedSignal({
    source: () => this.vehicle().id,
    computation: () => 0,
  });
  protected readonly hoverPaused = signal(false);

  constructor() {
    effect((onCleanup) => {
      const count = this.photos().length;
      if (count < 2 || this.hoverPaused()) {
        return;
      }
      const id = setInterval(() => {
        this.activeIndex.update((i) => (i + 1) % count);
      }, 5000);
      onCleanup(() => clearInterval(id));
    });
  }

  protected deleteVehicle(): void {
    this.deleteMutation.mutate(this.vehicle().id);
  }
}
