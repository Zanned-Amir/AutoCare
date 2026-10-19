import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/** Label + control + first validation error, shown once the field has been touched. Give the control the same id as `controlId`. */
@Component({
  selector: 'app-form-field',
  template: `
    <label
      class="mb-1.5 block text-[13px] leading-tight font-medium text-foreground-secondary"
      [for]="controlId()"
    >
      {{ label() }}
      @if (required()) {
        <span class="ml-0.5 text-error" aria-hidden="true">*</span>
      }
    </label>
    <ng-content />
    @if (error(); as message) {
      <p class="mt-1.5 text-caption text-error">{{ message }}</p>
    } @else if (hint(); as text) {
      <p class="mt-1.5 text-caption text-foreground-muted">{{ text }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FormField {
  readonly label = input.required<string>();
  readonly controlId = input.required<string>();
  readonly field = input.required<FieldTree<unknown>>();
  readonly required = input(false);
  /** Shown under the control while there is no error. */
  readonly hint = input<string | null>(null);

  protected readonly error = computed(() => {
    const state = this.field()();
    return state.touched() && state.invalid()
      ? (state.errors()[0]?.message ?? 'Valeur invalide')
      : null;
  });
}

/** Shared input classes so every text control looks the same. */
/** Shared field look (styles.css .ac-field): 52px pill, accent border on focus. Add utilities to adjust. */
export const inputClasses = 'ac-field';
