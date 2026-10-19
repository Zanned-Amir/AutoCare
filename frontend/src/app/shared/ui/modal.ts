import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';

import { cn } from '@shared/utils/cn';
import { Icon } from './icon';
import { bindOverlay } from './overlay';

const SIZES = { sm: 'md:w-[400px]', md: 'md:w-[520px]', lg: 'md:w-[640px]', xl: 'md:w-[760px]' };

/**
 * toutestcasa Modal: a sheet rising from the bottom on a phone (with its handle), a centred
 * dialog from md up. Content is projected; `[footer]` content goes in the action row, stacked
 * full width on a phone. Closes on the backdrop and Escape (`closed`).
 */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-4"
        [class.p-2]="bare()"
      >
        <div
          class="ac-overlay-in absolute inset-0 bg-background-inverse/40"
          aria-hidden="true"
          (click)="closed.emit()"
        ></div>
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title() || null"
          [class]="panelClass()"
        >
          @if (!bare()) {
            <span
              aria-hidden="true"
              class="mx-auto h-[5px] w-10 shrink-0 rounded-full bg-border-strong md:hidden"
            ></span>
          }
          @if (!bare() && title()) {
            <div class="flex shrink-0 items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-h4 text-primary">{{ title() }}</p>
                @if (description(); as text) {
                  <p class="mt-1 text-body-sm text-foreground-secondary">{{ text }}</p>
                }
              </div>
              <button
                type="button"
                aria-label="Fermer"
                class="grid size-10 shrink-0 place-items-center rounded-full text-foreground-secondary hover:bg-background-subtle"
                (click)="closed.emit()"
              >
                <svg appIcon name="x" class="size-5"></svg>
              </button>
            </div>
          }
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <ng-content />
          </div>
          <div
            class="flex shrink-0 flex-col-reverse gap-2.5 empty:hidden md:flex-row md:items-center md:justify-end md:gap-3 [&>*]:w-full md:[&>*]:w-auto"
          >
            <ng-content select="[footer]" />
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly open = input.required<boolean>();
  readonly title = input('');
  readonly description = input<string | null>(null);
  readonly size = input<keyof typeof SIZES>('md');
  /** No card of its own: the content is already a finished card (ConfirmDialog). */
  readonly bare = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();

  protected readonly panelClass = computed(() =>
    cn(
      'ac-dialog-in relative flex w-full max-w-full flex-col overflow-hidden',
      'max-h-[90vh] md:max-h-[calc(100vh-2rem)]',
      SIZES[this.size()],
      !this.bare() &&
        'gap-4 rounded-t-[22px] bg-surface px-5 pt-3 pb-6 shadow-[var(--shadow-raised)] md:gap-5 md:rounded-[18px] md:p-7',
    ),
  );

  constructor() {
    bindOverlay(this.open, () => this.closed.emit());
  }
}
