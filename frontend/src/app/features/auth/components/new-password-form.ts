import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { Button, FormField, PasswordToggle, inputClasses } from '@shared/ui';
import { injectResetPasswordMutation, injectResetPasswordWithCodeMutation } from '../auth.queries';
import { NewPasswordValue, newPasswordSchema } from '../auth.schema';

/** New password, checked with the e-mailed link token or with the e-mail + code. */
@Component({
  selector: 'app-new-password-form',
  imports: [Button, FormField, PasswordToggle, SignalFormField],
  template: `
    <form class="space-y-4" (submit)="save($event)" novalidate>
      @if (serverError(); as message) {
        <div role="alert" class="rounded-2xl border border-error bg-error-subtle px-4 py-3">
          <p class="text-body-sm font-medium text-error">{{ message }}</p>
        </div>
      }
      <app-form-field
        label="Nouveau mot de passe"
        controlId="new-password"
        [field]="passwordForm.newPassword"
        [required]="true"
        hint="8 caractères minimum"
      >
        <app-password-toggle>
          <input
            id="new-password"
            type="password"
            autocomplete="new-password"
            placeholder="Nouveau mot de passe"
            [class]="inputClasses"
            [formField]="passwordForm.newPassword"
          />
        </app-password-toggle>
      </app-form-field>
      <app-form-field
        label="Confirmer le mot de passe"
        controlId="confirm-password"
        [field]="passwordForm.confirmPassword"
        [required]="true"
      >
        <app-password-toggle>
          <input
            id="confirm-password"
            type="password"
            autocomplete="new-password"
            placeholder="Retapez le mot de passe"
            [class]="inputClasses"
            [formField]="passwordForm.confirmPassword"
          />
        </app-password-toggle>
      </app-form-field>
      <button appButton type="submit" class="w-full" [disabled]="!canSubmit()">
        Mettre à jour le mot de passe
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPasswordForm {
  readonly token = input<string | null>(null);
  readonly email = input<string | null>(null);
  readonly code = input<string | null>(null);
  readonly done = output<void>();
  readonly failed = output<string>();

  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<NewPasswordValue>({ newPassword: '', confirmPassword: '' });
  protected readonly passwordForm = form(this.model, (path) =>
    validateStandardSchema(path, newPasswordSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  private readonly withToken = injectResetPasswordMutation();
  private readonly withCode = injectResetPasswordWithCodeMutation();
  protected readonly canSubmit = computed(
    () => this.passwordForm().valid() && !this.withToken.isPending() && !this.withCode.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.passwordForm, async () => {
      this.serverError.set(null);
      try {
        const newPassword = this.model().newPassword;
        const token = this.token();
        if (token) await this.withToken.mutateAsync({ token, newPassword });
        else
          await this.withCode.mutateAsync({
            email: this.email() ?? '',
            code: this.code() ?? '',
            newPassword,
          });
        this.done.emit();
      } catch (error) {
        const message = problemMessage(error, 'Impossible de changer le mot de passe');
        this.serverError.set(message);
        this.failed.emit(message);
      }
      return undefined;
    });
  }
}
