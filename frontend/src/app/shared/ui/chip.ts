import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { cn } from '@shared/utils/cn';

/** Filter chip (toutestcasa Chip): pill, strong border; selected = petrol fill. */
export function chipClass(selected: boolean, extra = ''): string {
  return cn(
    'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-4 font-heading text-body-sm whitespace-nowrap transition-colors select-none',
    selected
      ? 'border-transparent bg-primary text-primary-foreground'
      : 'border-border-strong bg-surface text-foreground-secondary hover:bg-background-subtle',
    extra,
  );
}

/** Count inside a chip: white tint on the selected one. */
export function chipCountClass(selected: boolean): string {
  return cn(
    'rounded-full px-2 py-0.5 text-caption tabular-nums',
    selected
      ? 'bg-white/20 text-primary-foreground'
      : 'bg-background-subtle text-foreground-secondary',
  );
}

export interface SegmentOption<T> {
  value: T;
  label: string;
}

/** Segmented control (toutestcasa SegmentedControl): subtle track, the chosen segment raised in white. */
@Component({
  selector: 'app-segmented',
  template: `
    <div
      role="radiogroup"
      [attr.aria-label]="label()"
      class="flex h-10 rounded-full bg-surface-muted p-1"
    >
      @for (option of options(); track option.label) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="option.value === value()"
          [class]="segmentClass(option.value === value())"
          (click)="value.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Segmented<T> {
  readonly options = input.required<SegmentOption<T>[]>();
  readonly value = model.required<T>();
  readonly label = input('');

  protected segmentClass(active: boolean): string {
    return cn(
      'flex-1 rounded-full px-4 font-heading text-body-sm whitespace-nowrap transition-colors',
      active
        ? 'bg-surface font-semibold text-foreground shadow-[0_2px_6px_rgb(20_26_30/0.08)]'
        : 'text-foreground-secondary hover:text-foreground',
    );
  }
}
