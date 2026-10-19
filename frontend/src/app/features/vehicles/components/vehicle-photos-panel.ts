import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { Button, FileButton, Spinner } from '@shared/ui';
import { injectVehiclePhotoMutations, injectVehiclePhotosQuery } from '../vehicles.queries';

@Component({
  selector: 'app-vehicle-photos-panel',
  imports: [Button, FileButton, Spinner],
  template: `
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-h4">Photos</h2>
      <app-file-button
        [disabled]="mutations.upload.isPending() || (photos.data()?.length ?? 0) >= 8"
        (picked)="upload($event)"
        >{{ mutations.upload.isPending() ? 'Envoi…' : 'Ajouter une photo' }}</app-file-button
      >
    </div>
    @if (error(); as message) {
      <p class="mt-2 text-body-sm text-error">{{ message }}</p>
    }
    @if (photos.isPending()) {
      <div class="mt-4"><app-spinner /></div>
    } @else {
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        @for (photo of photos.data() ?? []; track photo.id) {
          <figure
            class="group relative overflow-hidden rounded-control border border-border-subtle"
          >
            <img
              [src]="photo.url"
              [alt]="photo.originalName"
              class="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            <button
              appButton
              variant="danger"
              size="sm"
              type="button"
              class="absolute top-2 right-2 opacity-90"
              [disabled]="mutations.remove.isPending()"
              (click)="mutations.remove.mutate(photo.id)"
              [attr.aria-label]="'Supprimer ' + photo.originalName"
            >
              ✕
            </button>
          </figure>
        } @empty {
          <p class="col-span-full text-body-sm text-foreground-muted">
            Aucune photo. Ajoutez-en jusqu'à 8 (JPEG, PNG ou WebP, 5 Mo maximum).
          </p>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclePhotosPanel {
  readonly vehicleId = input.required<number>();

  protected readonly photos = injectVehiclePhotosQuery(() => this.vehicleId());
  protected readonly mutations = injectVehiclePhotoMutations(() => this.vehicleId());
  protected readonly error = signal<string | null>(null);

  protected upload(file: File): void {
    this.error.set(null);
    this.mutations.upload.mutate(file, {
      onError: (e) => this.error.set(problemMessage(e, 'Envoi impossible')),
    });
  }
}
