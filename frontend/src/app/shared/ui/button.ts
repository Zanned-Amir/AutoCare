import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { cn } from '@shared/utils/cn';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Pill buttons; filled ones sit on a shadow tinted with their own colour (toutestcasa pattern). */
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_2px_5px_rgb(11_110_121/0.28)] hover:bg-primary-hover disabled:bg-graphite-200 disabled:text-foreground-muted disabled:shadow-none',
  accent:
    'bg-accent text-accent-foreground shadow-[0_3px_6px_rgb(255_176_32/0.38)] hover:bg-accent-hover disabled:bg-graphite-200 disabled:text-foreground-muted disabled:shadow-none',
  secondary:
    'border border-border-strong bg-surface text-primary hover:bg-background-subtle disabled:border-transparent disabled:bg-graphite-200 disabled:text-foreground-muted',
  ghost: 'text-primary hover:bg-background-subtle disabled:text-foreground-muted',
  danger:
    'bg-error text-white hover:opacity-90 disabled:bg-graphite-200 disabled:text-foreground-muted',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-11 px-6',
  lg: 'h-[52px] px-8',
};

@Component({
  // Attribute selector so native <button>/<a> semantics (type, href, disabled) stay intact.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[appButton], a[appButton]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');

  protected readonly classes = computed(() =>
    cn(
      'inline-flex items-center justify-center gap-2 rounded-full text-button whitespace-nowrap transition-[color,background-color,box-shadow]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none',
      variants[this.variant()],
      sizes[this.size()],
    ),
  );
}
