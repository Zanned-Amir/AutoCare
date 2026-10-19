import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  signal,
} from '@angular/core';

import { problemMessage } from '@core/api/api';
import { StoredFile } from '@shared/types/stored-file';
import { Button, Card, DropZone, DropZoneItem, FileButton } from '@shared/ui';
import {
  injectOrganizationFileMutations,
  injectOrganizationFilesQueries,
} from '../organizations.queries';

const MAX_PHOTOS = 8;

/**
 * Logo and photos for the public profile, papers checked before approval. In the workspace
 * (organization:update) or, with `admin`, through /admin for staff.
 */
@Component({
  selector: 'app-organization-files-panel',
  imports: [Button, Card, DropZone, FileButton],
  template: `
    <div class="flex flex-col gap-6">
      <app-card class="flex flex-col gap-4">
        <div>
          <h2 class="text-h4 text-foreground">Logo et photos</h2>
          <p class="text-body-sm text-foreground-secondary">
            Affichés sur la fiche publique et dans la recherche : la première photo sert de
            couverture.
          </p>
        </div>
        <div class="flex items-center gap-4">
          @if (files.logo.data(); as logo) {
            <img
              [src]="logo.url"
              alt="Logo"
              class="size-20 rounded-2xl border border-border-subtle object-cover"
            />
          } @else {
            <span
              class="grid size-20 place-items-center rounded-2xl bg-surface-muted text-caption text-foreground-muted"
              >Logo</span
            >
          }
          <div class="flex flex-wrap gap-2">
            <app-file-button
              [disabled]="busy()"
              (picked)="run(mutations.uploadLogo.mutateAsync($event))"
              >{{ files.logo.data() ? 'Changer le logo' : 'Ajouter un logo' }}</app-file-button
            >
            @if (files.logo.data()) {
              <button
                appButton
                variant="ghost"
                size="sm"
                type="button"
                (click)="run(mutations.deleteLogo.mutateAsync())"
              >
                Retirer
              </button>
            }
          </div>
        </div>
        <app-drop-zone
          [hint]="
            'JPG, PNG ou WebP, 5 Mo maximum · ' + photoCount() + ' / ' + maxPhotos + ' photos'
          "
          [items]="photoItems()"
          [disabled]="busy() || photoCount() >= maxPhotos"
          (files)="uploadPhotos($event)"
          (removed)="run(mutations.deletePhoto.mutateAsync(+$event.id))"
        />
      </app-card>

      <app-card class="flex flex-col gap-4">
        <div>
          <h2 class="text-h4 text-foreground">Documents de validation</h2>
          <p class="text-body-sm text-foreground-secondary">
            Registre de commerce, patente, carte d’identité du gérant. Visibles par notre équipe
            seulement.
          </p>
        </div>
        <app-drop-zone
          accept="application/pdf,image/jpeg,image/png,image/webp"
          hint="PDF ou image, 10 Mo maximum, 10 documents"
          [items]="documentItems()"
          [disabled]="busy()"
          (files)="uploadDocuments($event)"
          (removed)="run(mutations.deleteDocument.mutateAsync(+$event.id))"
        />
      </app-card>

      @if (error(); as message) {
        <p
          class="rounded-2xl border border-error bg-error-subtle px-4 py-3 text-body-sm text-error"
        >
          {{ message }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationFilesPanel {
  readonly organizationId = input.required<number>();
  readonly admin = input(false, { transform: booleanAttribute });

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly files = injectOrganizationFilesQueries(
    () => this.organizationId(),
    () => this.admin(),
  );
  protected readonly mutations = injectOrganizationFileMutations(
    () => this.organizationId(),
    () => this.admin(),
  );
  protected readonly error = signal<string | null>(null);
  protected readonly uploading = signal(0);

  protected readonly busy = computed(() => this.uploading() > 0);
  protected readonly photoCount = computed(() => this.files.photos.data()?.length ?? 0);
  protected readonly photoItems = computed(() => (this.files.photos.data() ?? []).map(toItem));
  protected readonly documentItems = computed(() =>
    (this.files.documents.data() ?? []).map(toItem),
  );

  protected uploadPhotos(files: File[]): void {
    const room = MAX_PHOTOS - this.photoCount();
    this.uploadAll(files.slice(0, room), (file) => this.mutations.uploadPhoto.mutateAsync(file));
    if (files.length > room) this.error.set(`${MAX_PHOTOS} photos au maximum.`);
  }

  protected uploadDocuments(files: File[]): void {
    this.uploadAll(files, (file) => this.mutations.uploadDocument.mutateAsync(file));
  }

  protected run(action: Promise<unknown>): void {
    this.error.set(null);
    action.catch((e: unknown) => this.error.set(problemMessage(e, 'Envoi impossible')));
  }

  /** One at a time, so the server's count limit is checked in order. */
  private async uploadAll(files: File[], send: (file: File) => Promise<unknown>): Promise<void> {
    this.error.set(null);
    this.uploading.update((n) => n + 1);
    try {
      for (const file of files) {
        try {
          await send(file);
        } catch (e) {
          this.error.set(`${file.name} : ${problemMessage(e, 'envoi impossible')}`);
        }
      }
    } finally {
      this.uploading.update((n) => n - 1);
    }
  }
}

function toItem(file: StoredFile): DropZoneItem {
  return {
    id: file.id,
    name: file.originalName,
    url: file.url,
    image: file.contentType.startsWith('image/'),
  };
}
