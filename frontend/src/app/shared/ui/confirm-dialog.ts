import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { cn } from '@shared/utils/cn';
import { Button } from './button';
import { Icon, IconName } from './icon';
import { Modal } from './modal';

/**
 * toutestcasa ConfirmDialog: icon chip, title, one sentence, then the way out and the action.
 * For actions that are hard to undo (suspend, remove). `busy` keeps the action from firing twice.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, Icon, Modal],
  template: `
    <app-modal [open]="open()" [title]="title()" size="sm" bare (closed)="cancel()">
      <div class="rounded-2xl bg-surface p-5 shadow-[var(--shadow-raised)] md:p-8">
        <span [class]="chipClass()"><svg appIcon [name]="icon()" class="size-5"></svg></span>
        <h3 class="mt-4 text-h4 text-foreground">{{ title() }}</h3>
        <p class="mt-2 text-body-sm text-foreground-secondary">{{ description() }}</p>
        @if (error(); as message) {
          <p
            class="mt-4 rounded-2xl border border-error bg-error-subtle px-4 py-3 text-body-sm text-error"
          >
            {{ message }}
          </p>
        }
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            appButton
            variant="secondary"
            type="button"
            [disabled]="busy()"
            (click)="cancel()"
          >
            {{ cancelLabel() }}
          </button>
          <button
            appButton
            [variant]="tone() === 'danger' ? 'danger' : 'primary'"
            type="button"
            [disabled]="busy()"
            (click)="confirmed.emit()"
          >
            {{ busy() ? 'Patientez…' : confirmLabel() }}
          </button>
        </div>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input('Annuler');
  readonly tone = input<'warning' | 'danger'>('warning');
  readonly icon = input<IconName>('info');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly chipClass = computed(() =>
    cn(
      'grid size-11 place-items-center rounded-full',
      this.tone() === 'danger' ? 'bg-error-subtle text-error' : 'bg-warning-subtle text-warning',
    ),
  );

  protected cancel(): void {
    if (!this.busy()) this.cancelled.emit();
  }
}
