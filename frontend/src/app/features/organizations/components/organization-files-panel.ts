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
import {
  Button,
  Card,
  ConfirmDialog,
  DropZone,
  DropZoneItem,
  FileButton,
  Icon,
  Lightbox,
} from '@shared/ui';
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
  imports: [Button, Card, ConfirmDialog, DropZone, FileButton, Icon, Lightbox],
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
              (picked)="run(mutations.uploadLogo.mutateAsync($event), 'Envoi impossible')"
              >{{ files.logo.data() ? 'Changer le logo' : 'Ajouter un logo' }}</app-file-button
            >
            @if (files.logo.data()) {
              <button
                appButton
                variant="ghost"
                size="sm"
                type="button"
                (click)="askRemove('logo', null, 'le logo')"
              >
                Retirer
              </button>
            }
          </div>
        </div>
        @if (photos().length) {
          <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos">
            @for (photo of photos(); track photo.id; let i = $index; let last = $last) {
              <li class="group relative overflow-hidden rounded-2xl border border-border-subtle">
                <button
                  type="button"
                  class="block aspect-[4/3] w-full"
                  [attr.aria-label]="'Voir la photo ' + (i + 1)"
                  (click)="viewing.set(i)"
                >
                  <img
                    [src]="photo.url"
                    [alt]="photo.originalName"
                    loading="lazy"
                    class="size-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                </button>
                @if (i === 0) {
                  <span
                    class="absolute top-2 left-2 rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-accent-foreground shadow-card"
                    >Couverture</span
                  >
                }
                <div
                  class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6"
                >
                  <div class="flex gap-1">
                    <button
                      type="button"
                      [class]="photoAction"
                      [disabled]="i === 0 || busy()"
                      [attr.aria-label]="'Avancer la photo ' + (i + 1)"
                      (click)="move(i, -1)"
                    >
                      <svg appIcon name="chevron-left" class="size-4"></svg>
                    </button>
                    <button
                      type="button"
                      [class]="photoAction"
                      [disabled]="last || busy()"
                      [attr.aria-label]="'Reculer la photo ' + (i + 1)"
                      (click)="move(i, 1)"
                    >
                      <svg appIcon name="chevron-left" class="size-4 rotate-180"></svg>
                    </button>
                  </div>
                  <div class="flex gap-1">
                    @if (i > 0) {
                      <button
                        type="button"
                        [class]="photoAction"
                        [disabled]="busy()"
                        title="Mettre en couverture"
                        [attr.aria-label]="'Mettre la photo ' + (i + 1) + ' en couverture'"
                        (click)="makeCover(i)"
                      >
                        <svg appIcon name="star" class="size-4"></svg>
                      </button>
                    }
                    <button
                      type="button"
                      [class]="photoAction + ' hover:!bg-error'"
                      [disabled]="busy()"
                      [attr.aria-label]="'Supprimer la photo ' + (i + 1)"
                      (click)="askRemove('photo', photo.id, photo.originalName)"
                    >
                      <svg appIcon name="trash" class="size-4"></svg>
                    </button>
                  </div>
                </div>
              </li>
            }
          </ul>
        }
        <app-drop-zone
          [hint]="
            'JPG, PNG ou WebP, 5 Mo maximum · ' + photoCount() + ' / ' + maxPhotos + ' photos'
          "
          [items]="[]"
          [disabled]="busy() || photoCount() >= maxPhotos"
          (files)="uploadPhotos($event)"
        />
        <app-lightbox [images]="lightboxImages()" [(index)]="viewing" />
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
          (removed)="askRemove('document', +$event.id, $event.name)"
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

    <app-confirm-dialog
      [open]="removing() !== null"
      tone="danger"
      icon="trash"
      title="Supprimer ce fichier ?"
      [description]="'« ' + (removing()?.name ?? '') + ' » sera supprimé définitivement.'"
      confirmLabel="Supprimer"
      [busy]="removeBusy()"
      [error]="removeError()"
      (confirmed)="confirmRemove()"
      (cancelled)="removing.set(null)"
    />
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
  protected readonly photos = computed(() => this.files.photos.data() ?? []);
  protected readonly lightboxImages = computed(() =>
    this.photos().map((photo) => ({ url: photo.url, name: photo.originalName })),
  );
  protected readonly viewing = signal<number | null>(null);
  protected readonly photoAction =
    'grid size-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-40';
  protected readonly documentItems = computed(() =>
    (this.files.documents.data() ?? []).map(toItem),
  );

  protected uploadPhotos(files: File[]): void {
    const room = MAX_PHOTOS - this.photoCount();
    this.uploadAll(files.slice(0, room), (file) => this.mutations.uploadPhoto.mutateAsync(file));
    if (files.length > room) this.error.set(`${MAX_PHOTOS} photos au maximum.`);
  }

  /** Swaps a photo with its neighbour; the first photo is the cover. */
  protected move(index: number, step: number): void {
    const ids = this.photos().map((photo) => photo.id);
    const target = index + step;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    this.run(this.mutations.reorderPhotos.mutateAsync(ids));
  }

  protected makeCover(index: number): void {
    const ids = this.photos().map((photo) => photo.id);
    const [cover] = ids.splice(index, 1);
    this.run(this.mutations.reorderPhotos.mutateAsync([cover!, ...ids]));
  }

  protected uploadDocuments(files: File[]): void {
    this.uploadAll(files, (file) => this.mutations.uploadDocument.mutateAsync(file));
  }

  protected run(action: Promise<unknown>, fallback = 'Action impossible'): void {
    this.error.set(null);
    action.catch((e: unknown) => this.error.set(problemMessage(e, fallback)));
  }

  protected readonly removing = signal<{
    kind: 'logo' | 'photo' | 'document';
    id: number | null;
    name: string;
  } | null>(null);
  protected readonly removeError = signal<string | null>(null);
  protected readonly removeBusy = computed(
    () =>
      this.mutations.deleteLogo.isPending() ||
      this.mutations.deletePhoto.isPending() ||
      this.mutations.deleteDocument.isPending(),
  );

  protected askRemove(kind: 'logo' | 'photo' | 'document', id: number | null, name: string): void {
    this.removeError.set(null);
    this.removing.set({ kind, id, name });
  }

  protected confirmRemove(): void {
    const target = this.removing();
    if (!target) return;
    const action =
      target.kind === 'logo'
        ? this.mutations.deleteLogo.mutateAsync()
        : target.kind === 'photo'
          ? this.mutations.deletePhoto.mutateAsync(target.id!)
          : this.mutations.deleteDocument.mutateAsync(target.id!);
    this.removeError.set(null);
    action
      .then(() => this.removing.set(null))
      .catch((e: unknown) => this.removeError.set(problemMessage(e, 'Suppression impossible')));
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
