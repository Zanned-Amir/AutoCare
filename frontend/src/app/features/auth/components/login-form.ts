import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { SessionScope } from '@core/auth/auth.types';
import { Button, FormField, PasswordToggle, inputClasses } from '@shared/ui';
import { injectLoginMutation } from '../auth.queries';
import { LoginValue, loginSchema } from '../auth.schema';

@Component({
  selector: 'app-login-form',
  imports: [Button, FormField, PasswordToggle, RouterLink, SignalFormField],
  template: `
    <form class="space-y-4" (submit)="save($event)" novalidate>
      @if (serverError(); as message) {
        <div role="alert" class="rounded-2xl border border-error bg-error-subtle px-4 py-3">
          <p class="text-body-sm font-medium text-error">{{ message }}</p>
        </div>
      }
      <app-form-field
        label="Adresse e-mail"
        controlId="login-email"
        [field]="loginForm.email"
        [required]="true"
      >
        <input
          id="login-email"
          type="email"
          autocomplete="email"
          placeholder="Votre adresse e-mail"
          [class]="inputClasses"
          [formField]="loginForm.email"
        />
      </app-form-field>
      <app-form-field
        label="Mot de passe"
        controlId="login-password"
        [field]="loginForm.password"
        [required]="true"
      >
        <app-password-toggle>
          <input
            id="login-password"
            type="password"
            autocomplete="current-password"
            placeholder="Votre mot de passe"
            [class]="inputClasses"
            [formField]="loginForm.password"
          />
        </app-password-toggle>
      </app-form-field>
      @if (forgotLink()) {
        <div class="flex justify-end">
          <a
            routerLink="/forgot-password"
            class="text-body-sm font-medium text-primary hover:underline"
            >Mot de passe oublié ?</a
          >
        </div>
      }
      <button appButton type="submit" class="w-full" [disabled]="!canSubmit()">
        {{ login.isPending() ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm {
  /** 'backoffice' on the staff login page. */
  readonly scope = input<SessionScope>('customer');
  readonly forgotLink = input(true);
  readonly loggedIn = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<LoginValue>({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (path) =>
    validateStandardSchema(path, loginSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  protected readonly login = injectLoginMutation(() => this.scope());
  protected readonly canSubmit = computed(
    () => this.loginForm().valid() && !this.login.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.loginForm, async () => {
      this.serverError.set(null);
      try {
        await this.login.mutateAsync(this.model());
        this.loggedIn.emit();
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Connexion impossible'));
      }
      return undefined;
    });
  }
}
