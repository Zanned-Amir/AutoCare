import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-foreground-secondary',
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  error: 'bg-error-subtle text-error',
  info: 'bg-info-subtle text-info',
};

@Component({
  selector: 'app-badge',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');

  protected readonly classes = computed(
    () =>
      `inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold ${tones[this.tone()]}`,
  );
}
