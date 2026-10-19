import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { Button, FormField, inputClasses } from '@shared/ui';
import { injectRequestEmailChangeMutation } from '../account.queries';
import { ChangeEmailValue, changeEmailSchema } from '../account.schema';

const empty: ChangeEmailValue = { newEmail: '', currentPassword: '' };

@Component({
  selector: 'app-change-email-form',
  imports: [Button, FormField, SignalFormField],
  template: `
    <p class="mb-4 text-body-sm text-foreground-secondary">
      Adresse actuelle : <strong class="text-foreground">{{ auth.user()?.email }}</strong
      >. Un lien de confirmation sera envoyé à la nouvelle adresse.
    </p>
    <form class="flex flex-col gap-4" (submit)="save($event)" novalidate>
      <app-form-field
        label="Nouvelle adresse e-mail"
        controlId="ce-email"
        [field]="emailForm.newEmail"
      >
        <input
          id="ce-email"
          type="email"
          autocomplete="email"
          [class]="inputClasses"
          [formField]="emailForm.newEmail"
        />
      </app-form-field>
      <app-form-field
        label="Mot de passe actuel"
        controlId="ce-password"
        [field]="emailForm.currentPassword"
      >
        <input
          id="ce-password"
          type="password"
          autocomplete="current-password"
          [class]="inputClasses"
          [formField]="emailForm.currentPassword"
        />
      </app-form-field>
      @if (feedback(); as text) {
        <p class="text-body-sm" [class]="failed() ? 'text-error' : 'text-success'">{{ text }}</p>
      }
      <div class="flex justify-end">
        <button appButton type="submit" [disabled]="!canSubmit()">Envoyer le lien</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeEmailForm {
  protected readonly auth = inject(AuthStore);
  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<ChangeEmailValue>(empty);
  protected readonly emailForm = form(this.model, (path) =>
    validateStandardSchema(path, changeEmailSchema),
  );
  protected readonly feedback = signal<string | null>(null);
  protected readonly failed = signal(false);
  private readonly request = injectRequestEmailChangeMutation();
  protected readonly canSubmit = computed(
    () => this.emailForm().dirty() && this.emailForm().valid() && !this.request.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.emailForm, async () => {
      this.feedback.set(null);
      try {
        const target = this.model().newEmail;
        await this.request.mutateAsync(this.model());
        this.emailForm().reset(empty);
        this.failed.set(false);
        this.feedback.set(`Lien envoyé à ${target}. Il est valable 15 minutes.`);
      } catch (error) {
        this.failed.set(true);
        this.feedback.set(problemMessage(error, "Impossible d'envoyer le lien"));
      }
      return undefined;
    });
  }
}
