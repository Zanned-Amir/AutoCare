import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { cn } from '@shared/utils/cn';
import { Icon } from './icon';

/**
 * toutestcasa CheckoutStepper: numbered trail on desktop, "Étape 2 sur 4" over a progress bar on
 * a phone. `current` is 0-based. Only finished steps are clickable: jumping ahead would skip
 * the checks each step runs before it hands over.
 */
@Component({
  selector: 'app-stepper',
  imports: [Icon],
  template: `
    <div class="flex flex-col gap-2 md:hidden">
      <p class="text-body-sm font-semibold text-foreground">
        Étape {{ current() + 1 }} sur {{ steps().length }} : {{ steps()[current()] }}
      </p>
      <div
        class="h-2 w-full overflow-hidden rounded-full bg-background-subtle"
        role="progressbar"
        aria-valuemin="1"
        [attr.aria-valuemax]="steps().length"
        [attr.aria-valuenow]="current() + 1"
      >
        <div
          class="h-full rounded-full bg-accent transition-[width] duration-300"
          [style.width.%]="progress()"
        ></div>
      </div>
    </div>

    <ol class="hidden items-center gap-2 md:flex">
      @for (label of steps(); track label; let i = $index; let last = $last) {
        <li class="flex flex-1 items-center gap-2.5 last:flex-none">
          <button
            type="button"
            [disabled]="i >= current()"
            [attr.aria-current]="i === current() ? 'step' : null"
            [attr.aria-label]="'Étape ' + (i + 1) + ' : ' + label"
            [class]="nodeClass(i)"
            (click)="stepChange.emit(i)"
          >
            @if (i < current()) {
              <svg appIcon name="check" class="size-[18px]"></svg>
            } @else {
              {{ i + 1 }}
            }
          </button>
          <span
            class="text-overline whitespace-nowrap"
            [class.text-foreground]="i <= current()"
            [class.text-foreground-muted]="i > current()"
            >{{ label }}</span
          >
          @if (!last) {
            <span
              aria-hidden="true"
              class="h-0.5 min-w-6 flex-1 rounded-full"
              [class.bg-primary]="i < current()"
              [class.bg-border]="i >= current()"
            ></span>
          }
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stepper {
  readonly steps = input.required<string[]>();
  readonly current = input.required<number>();
  readonly stepChange = output<number>();

  protected readonly progress = computed(
    () => ((this.current() + 1) / Math.max(this.steps().length, 1)) * 100,
  );

  protected nodeClass(index: number): string {
    const current = this.current();
    return cn(
      'flex size-[34px] shrink-0 items-center justify-center rounded-full text-body-sm transition-colors',
      index < current && 'bg-primary text-primary-foreground hover:bg-primary-hover',
      index === current && 'bg-accent font-semibold text-accent-foreground',
      index > current && 'border-[1.5px] border-border-strong bg-surface text-foreground-muted',
    );
  }
}

/**
 * toutestcasa CheckoutRecapCard: what a finished step decided, shown on the steps after it.
 * "Modifier" goes back to that step, so each answer is given in one place.
 */
@Component({
  selector: 'app-step-recap',
  template: `
    <div class="flex items-start justify-between gap-4 rounded-xl bg-background-subtle px-4 py-3.5">
      <div class="flex min-w-0 flex-col gap-0.5">
        <p class="text-label text-foreground">{{ title() }}</p>
        @for (line of shownLines(); track $index) {
          <p class="text-body-sm text-foreground-secondary">{{ line }}</p>
        }
        <ng-content />
      </div>
      <button
        type="button"
        class="shrink-0 text-body-sm font-semibold text-accent-text transition-colors hover:text-signal-800"
        (click)="edit.emit()"
      >
        Modifier
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepRecap {
  readonly title = input.required<string>();
  /** Empty lines are dropped, so a missing optional answer leaves no blank row. */
  readonly lines = input<(string | null | undefined)[]>([]);
  readonly edit = output<void>();

  protected readonly shownLines = computed(() =>
    this.lines().filter((line): line is string => !!line && !!line.trim()),
  );
}
