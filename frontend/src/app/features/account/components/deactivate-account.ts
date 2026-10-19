import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { Button, FormField, inputClasses } from '@shared/ui';
import { injectSessionMutations } from '../account.queries';
import { DeactivateValue, deactivateSchema } from '../account.schema';

@Component({
  selector: 'app-deactivate-account',
  imports: [Button, FormField, SignalFormField],
  template: `
    <p class="text-body-sm text-foreground-secondary">
      Votre compte sera désactivé et tous vos appareils déconnectés. Contactez le support pour le
      réactiver.
    </p>
    @if (!confirming()) {
      <div class="mt-4 flex justify-end">
        <button appButton variant="danger" size="sm" type="button" (click)="confirming.set(true)">
          Désactiver mon compte
        </button>
      </div>
    } @else {
      <form class="mt-4 flex flex-col gap-4" (submit)="save($event)" novalidate>
        <app-form-field
          label="Confirmez avec votre mot de passe"
          controlId="deactivate-password"
          [field]="deactivateForm.currentPassword"
        >
          <input
            id="deactivate-password"
            type="password"
            autocomplete="current-password"
            [class]="inputClasses"
            [formField]="deactivateForm.currentPassword"
          />
        </app-form-field>
        @if (serverError(); as message) {
          <p class="text-body-sm text-error">{{ message }}</p>
        }
        <div class="flex justify-end gap-2">
          <button appButton variant="ghost" size="sm" type="button" (click)="confirming.set(false)">
            Annuler
          </button>
          <button appButton variant="danger" size="sm" type="submit" [disabled]="!canSubmit()">
            Désactiver définitivement
          </button>
        </div>
      </form>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeactivateAccount {
  readonly deactivated = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly confirming = signal(false);
  protected readonly model = signal<DeactivateValue>({ currentPassword: '' });
  protected readonly deactivateForm = form(this.model, (path) =>
    validateStandardSchema(path, deactivateSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  private readonly mutations = injectSessionMutations();
  protected readonly canSubmit = computed(
    () => this.deactivateForm().valid() && !this.mutations.deactivate.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.deactivateForm, async () => {
      this.serverError.set(null);
      try {
        await this.mutations.deactivate.mutateAsync(this.model().currentPassword);
        this.deactivated.emit();
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Désactivation impossible'));
      }
      return undefined;
    });
  }
}
