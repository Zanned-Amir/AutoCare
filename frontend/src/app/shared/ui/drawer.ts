import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from './icon';
import { bindOverlay } from './overlay';

/**
 * toutestcasa Drawer: a 420px panel sliding in from the right (full width on a phone), for
 * create forms and details beside a list. Title with a round close button, scrolling content,
 * `[footer]` content pinned at the bottom. Closes on the backdrop and Escape (`closed`).
 */
@Component({
  selector: 'app-drawer',
  imports: [Icon],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[80] flex">
        <div
          class="ac-overlay-in absolute inset-0 bg-background-inverse/40"
          aria-hidden="true"
          (click)="closed.emit()"
        ></div>
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title() || null"
          class="ac-drawer-in relative ml-auto flex h-full w-[420px] max-w-full flex-col bg-surface shadow-[var(--shadow-raised)]"
        >
          <div class="flex shrink-0 items-start justify-between gap-4 pt-6 pr-5 pb-4 pl-6">
            <div class="min-w-0">
              <p class="text-h4 text-primary">{{ title() }}</p>
              @if (description(); as text) {
                <p class="mt-1 text-body-sm text-foreground-secondary">{{ text }}</p>
              }
            </div>
            <button
              type="button"
              aria-label="Fermer"
              class="grid size-10 shrink-0 place-items-center rounded-full bg-background-subtle text-foreground-secondary hover:text-foreground"
              (click)="closed.emit()"
            >
              <svg appIcon name="x" class="size-[18px]"></svg>
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-6">
            <ng-content />
          </div>
          <div
            class="flex shrink-0 items-center justify-end gap-3 border-t border-border-subtle px-6 py-4 empty:hidden"
          >
            <ng-content select="[footer]" />
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drawer {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly closed = output<void>();

  constructor() {
    bindOverlay(this.open, () => this.closed.emit());
  }
}
