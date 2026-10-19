import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Illustrations in public/illustrations (original SVGs, brand palette). */
export type IllustrationName =
  | 'hero-car'
  | 'empty-vehicles'
  | 'empty-requests'
  | 'empty-search'
  | 'diagnostic'
  | 'pro-garage'
  | 'support'
  | 'not-found';

/** Illustration, title, text and optional actions (projected), for empty lists and dead ends. */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="flex flex-col items-center px-4 py-8 text-center">
      <img [src]="src()" alt="" [class]="imageClass()" loading="lazy" decoding="async" />
      <h2 class="mt-4 text-h4 text-foreground">{{ title() }}</h2>
      @if (description(); as text) {
        <p class="mt-1 max-w-md text-body-sm text-foreground-secondary">{{ text }}</p>
      }
      <div class="mt-4 flex flex-wrap justify-center gap-2 empty:hidden"><ng-content /></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmptyState {
  readonly image = input.required<IllustrationName>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly size = input<'sm' | 'md'>('md');

  protected readonly src = computed(() => `illustrations/${this.image()}.svg`);
  protected readonly imageClass = computed(
    () => (this.size() === 'sm' ? 'h-28' : 'h-44') + ' w-auto select-none dark:opacity-90',
  );
}
