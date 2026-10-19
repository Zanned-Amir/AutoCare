import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { Button, FormField, inputClasses } from '@shared/ui';
import { injectChangePasswordMutation } from '../account.queries';
import { ChangePasswordValue, changePasswordSchema } from '../account.schema';

const empty: ChangePasswordValue = { currentPassword: '', newPassword: '', confirmPassword: '' };

@Component({
  selector: 'app-change-password-form',
  imports: [Button, FormField, SignalFormField],
  template: `
    <form class="flex flex-col gap-4" (submit)="save($event)" novalidate>
      <app-form-field
        label="Mot de passe actuel"
        controlId="cp-current"
        [field]="passwordForm.currentPassword"
      >
        <input
          id="cp-current"
          type="password"
          autocomplete="current-password"
          [class]="inputClasses"
          [formField]="passwordForm.currentPassword"
        />
      </app-form-field>
      <app-form-field
        label="Nouveau mot de passe"
        controlId="cp-new"
        [field]="passwordForm.newPassword"
      >
        <input
          id="cp-new"
          type="password"
          autocomplete="new-password"
          [class]="inputClasses"
          [formField]="passwordForm.newPassword"
        />
      </app-form-field>
      <app-form-field
        label="Confirmer le nouveau mot de passe"
        controlId="cp-confirm"
        [field]="passwordForm.confirmPassword"
      >
        <input
          id="cp-confirm"
          type="password"
          autocomplete="new-password"
          [class]="inputClasses"
          [formField]="passwordForm.confirmPassword"
        />
      </app-form-field>
      @if (feedback(); as text) {
        <p class="text-body-sm" [class]="failed() ? 'text-error' : 'text-success'">{{ text }}</p>
      }
      <div class="flex justify-end">
        <button appButton type="submit" [disabled]="!canSubmit()">Changer le mot de passe</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordForm {
  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<ChangePasswordValue>(empty);
  protected readonly passwordForm = form(this.model, (path) =>
    validateStandardSchema(path, changePasswordSchema),
  );
  protected readonly feedback = signal<string | null>(null);
  protected readonly failed = signal(false);
  private readonly change = injectChangePasswordMutation();
  protected readonly canSubmit = computed(
    () => this.passwordForm().dirty() && this.passwordForm().valid() && !this.change.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.passwordForm, async () => {
      this.feedback.set(null);
      try {
        await this.change.mutateAsync(this.model());
        this.passwordForm().reset(empty);
        this.failed.set(false);
        this.feedback.set('Mot de passe changé. Vos autres appareils ont été déconnectés.');
      } catch (error) {
        this.failed.set(true);
        this.feedback.set(problemMessage(error, 'Impossible de changer le mot de passe'));
      }
      return undefined;
    });
  }
}
