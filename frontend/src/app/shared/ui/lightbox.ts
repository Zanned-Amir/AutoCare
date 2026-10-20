import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { Icon } from './icon';
import { bindOverlay } from './overlay';

export interface LightboxImage {
  url: string;
  /** Shown under the photo and used as its alt text. */
  name?: string | null;
}

/**
 * Full-screen photo viewer: `index` is the photo shown (null = closed). Arrows (buttons or
 * keyboard) move through `images`, Escape or the backdrop closes it.
 */
@Component({
  selector: 'app-lightbox',
  imports: [Icon],
  template: `
    @if (current(); as image) {
      <div
        class="ac-overlay-in fixed inset-0 z-[90] flex flex-col"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Photo ' + (index()! + 1) + ' sur ' + images().length"
      >
        <div
          class="absolute inset-0 bg-black/90"
          aria-hidden="true"
          (click)="index.set(null)"
        ></div>
        <div
          class="relative flex shrink-0 items-center justify-between gap-4 px-4 py-3 text-white/80"
        >
          <span class="text-body-sm tabular-nums">{{ index()! + 1 }} / {{ images().length }}</span>
          <div class="flex items-center gap-2">
            <a
              [href]="image.url"
              target="_blank"
              rel="noopener"
              class="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Ouvrir l’original"
              ><svg appIcon name="external" class="size-[18px]"></svg
            ></a>
            <button
              type="button"
              aria-label="Fermer"
              class="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              (click)="index.set(null)"
            >
              <svg appIcon name="x" class="size-[18px]"></svg>
            </button>
          </div>
        </div>
        <!-- Clicks around the photo fall through to the backdrop and close. -->
        <div
          class="pointer-events-none relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 md:px-16"
        >
          <img
            [src]="image.url"
            [alt]="image.name || 'Photo'"
            class="pointer-events-auto max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
          @if (images().length > 1) {
            <button
              type="button"
              aria-label="Photo précédente"
              class="pointer-events-auto absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 md:left-4"
              (click)="move(-1)"
            >
              <svg appIcon name="chevron-left" class="size-5"></svg>
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              class="pointer-events-auto absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 md:right-4"
              (click)="move(1)"
            >
              <svg appIcon name="chevron-left" class="size-5 rotate-180"></svg>
            </button>
          }
        </div>
        @if (image.name) {
          <p class="relative shrink-0 truncate px-4 pb-4 text-center text-caption text-white/70">
            {{ image.name }}
          </p>
        }
      </div>
    }
  `,
  host: {
    '(document:keydown.arrowleft)': 'index() !== null && move(-1)',
    '(document:keydown.arrowright)': 'index() !== null && move(1)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lightbox {
  readonly images = input.required<LightboxImage[]>();
  readonly index = model<number | null>(null);

  protected readonly current = computed(() => {
    const index = this.index();
    return index === null ? null : (this.images()[index] ?? null);
  });

  constructor() {
    bindOverlay(
      computed(() => this.current() !== null),
      () => this.index.set(null),
    );
  }

  protected move(step: number): void {
    const count = this.images().length;
    const index = this.index();
    if (index === null || count === 0) return;
    this.index.set((index + step + count) % count);
  }
}
