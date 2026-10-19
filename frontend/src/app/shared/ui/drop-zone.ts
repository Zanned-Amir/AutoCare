import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { cn } from '@shared/utils/cn';
import { Icon } from './icon';

/** A file chosen in the drop zone or already stored; `url` is a preview or a signed link. */
export interface DropZoneItem {
  id: string | number;
  name: string;
  url: string | null;
  /** Images show as a thumbnail, other files (PDF) as a row with their name. */
  image: boolean;
}

/**
 * toutestcasa MediaUploader: dashed zone to drop files or browse, then thumbnails (images) or
 * rows (documents) with a remove button. The server still checks type, size and count.
 */
@Component({
  selector: 'app-drop-zone',
  imports: [Icon],
  template: `
    <div
      [class]="zoneClass()"
      (dragover)="$event.preventDefault(); dragging.set(true)"
      (dragleave)="dragging.set(false)"
      (drop)="drop($event)"
    >
      <span class="grid size-12 place-items-center rounded-full bg-primary-subtle text-primary">
        <svg appIcon [name]="images() ? 'image-plus' : 'upload'" class="size-6"></svg>
      </span>
      <p class="text-center text-body font-medium text-foreground">
        Glissez {{ images() ? 'vos images' : 'vos fichiers' }} ici ou
        <label
          class="cursor-pointer text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          parcourir
          <input
            type="file"
            class="sr-only"
            [accept]="accept()"
            [multiple]="multiple()"
            [disabled]="disabled()"
            (change)="pick($event)"
          />
        </label>
      </p>
      <p class="text-center text-caption text-foreground-muted">{{ hint() }}</p>
    </div>

    @if (items().length) {
      @if (images()) {
        <ul class="mt-3 flex flex-wrap gap-3">
          @for (item of items(); track item.id) {
            <li class="group relative">
              @if (item.url) {
                <img
                  [src]="item.url"
                  [alt]="item.name"
                  class="size-20 rounded-xl border border-border-subtle object-cover"
                />
              } @else {
                <span
                  class="grid size-20 place-items-center rounded-xl bg-surface-muted text-caption"
                  >{{ item.name }}</span
                >
              }
              <button
                type="button"
                class="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-foreground text-background shadow"
                [attr.aria-label]="'Retirer ' + item.name"
                (click)="removed.emit(item)"
              >
                <svg appIcon name="x" class="size-3.5"></svg>
              </button>
            </li>
          }
        </ul>
      } @else {
        <ul class="mt-3 flex flex-col gap-2">
          @for (item of items(); track item.id) {
            <li
              class="flex items-center gap-3 rounded-xl border border-border-subtle px-3 py-2.5 text-body-sm"
            >
              <svg appIcon name="file" class="size-4 text-primary"></svg>
              @if (item.url) {
                <a
                  [href]="item.url"
                  target="_blank"
                  rel="noopener"
                  class="min-w-0 flex-1 truncate text-foreground hover:text-primary hover:underline"
                  >{{ item.name }}</a
                >
              } @else {
                <span class="min-w-0 flex-1 truncate text-foreground">{{ item.name }}</span>
              }
              <button
                type="button"
                class="grid size-8 place-items-center rounded-full text-foreground-muted hover:bg-background-subtle hover:text-error"
                [attr.aria-label]="'Retirer ' + item.name"
                (click)="removed.emit(item)"
              >
                <svg appIcon name="trash" class="size-4"></svg>
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DropZone {
  readonly accept = input('image/jpeg,image/png,image/webp');
  readonly multiple = input(true);
  readonly hint = input('JPG, PNG ou WebP, 5 Mo maximum');
  readonly items = input<DropZoneItem[]>([]);
  readonly disabled = input(false);
  readonly files = output<File[]>();
  readonly removed = output<DropZoneItem>();

  protected readonly dragging = signal(false);
  protected readonly images = () =>
    this.accept()
      .split(',')
      .every((type) => type.startsWith('image/'));

  protected zoneClass(): string {
    return cn(
      'flex flex-col items-center gap-2 rounded-[20px] border-[1.5px] border-dashed px-6 py-7 transition-colors',
      this.dragging()
        ? 'border-primary bg-primary-subtle'
        : 'border-border-strong bg-background-subtle',
      this.disabled() && 'pointer-events-none opacity-60',
    );
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.files.emit(this.multiple() ? files : files.slice(0, 1));
  }

  protected pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.files.emit(files);
    input.value = '';
  }
}
