import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { Button, FormField, PasswordToggle, inputClasses } from '@shared/ui';
import { injectRegisterMutation } from '../auth.queries';
import { RegisterValue, registerSchema } from '../auth.schema';

@Component({
  selector: 'app-register-form',
  imports: [Button, FormField, PasswordToggle, SignalFormField],
  template: `
    <form class="space-y-4" (submit)="save($event)" novalidate>
      @if (serverError(); as message) {
        <div role="alert" class="rounded-2xl border border-error bg-error-subtle px-4 py-3">
          <p class="text-body-sm font-medium text-error">{{ message }}</p>
        </div>
      }
      <app-form-field
        label="Nom complet"
        controlId="register-name"
        [field]="registerForm.fullName"
        [required]="true"
      >
        <input
          id="register-name"
          autocomplete="name"
          placeholder="Prénom et nom"
          [class]="inputClasses"
          [formField]="registerForm.fullName"
        />
      </app-form-field>
      <app-form-field
        label="Adresse e-mail"
        controlId="register-email"
        [field]="registerForm.email"
        [required]="true"
      >
        <input
          id="register-email"
          type="email"
          autocomplete="email"
          placeholder="Votre adresse e-mail"
          [class]="inputClasses"
          [formField]="registerForm.email"
        />
      </app-form-field>
      <app-form-field
        label="Numéro de téléphone"
        controlId="register-phone"
        [field]="registerForm.phone"
        hint="Optionnel, pour être rappelé par le garage."
      >
        <input
          id="register-phone"
          type="tel"
          autocomplete="tel"
          placeholder="+216 20 000 000"
          [class]="inputClasses"
          [formField]="registerForm.phone"
        />
      </app-form-field>
      <app-form-field
        label="Mot de passe"
        controlId="register-password"
        [field]="registerForm.password"
        [required]="true"
        hint="8 caractères minimum"
      >
        <app-password-toggle>
          <input
            id="register-password"
            type="password"
            autocomplete="new-password"
            placeholder="Choisissez un mot de passe"
            [class]="inputClasses"
            [formField]="registerForm.password"
          />
        </app-password-toggle>
      </app-form-field>
      <button appButton type="submit" class="w-full" [disabled]="!canSubmit()">
        {{ register.isPending() ? 'Création…' : 'Créer mon compte' }}
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterForm {
  readonly registered = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<RegisterValue>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  protected readonly registerForm = form(this.model, (path) =>
    validateStandardSchema(path, registerSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  protected readonly register = injectRegisterMutation();
  protected readonly canSubmit = computed(
    () => this.registerForm().valid() && !this.register.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.registerForm, async () => {
      this.serverError.set(null);
      try {
        await this.register.mutateAsync(registerSchema.parse(this.model()));
        this.registered.emit();
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Inscription impossible'));
      }
      return undefined;
    });
  }
}
