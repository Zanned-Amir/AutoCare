import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { z } from 'zod';

import { problemMessage } from '@core/api/api';
import { ResetChannel } from '@features/auth/auth.api';
import { injectRequestPasswordResetMutation } from '@features/auth/auth.queries';
import { Button, FormField, Icon, IconName, inputClasses } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { PasswordResetStore } from '@store/password-reset.store';

const schema = z.object({ email: z.email('Adresse e-mail invalide') });

/** Codes only in the UI (e-mail or SMS). The API still accepts LINK and TELEGRAM for other clients. */
const CHANNELS: { value: ResetChannel; label: string; icon: IconName }[] = [
  { value: 'OTP', label: 'Code par e-mail', icon: 'mail' },
  { value: 'SMS', label: 'Code par SMS', icon: 'smartphone' },
];

/** Step 1 of the reset: the address and how to receive the link or the code. */
@Component({
  selector: 'app-forgot-password-page',
  imports: [Button, FormField, Icon, RouterLink, SignalFormField],
  template: `
    <div class="mb-6 text-center">
      <h2 class="text-h3 text-foreground">Mot de passe oublié</h2>
      <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
        Indiquez votre adresse : nous vous envoyons un code à 6 chiffres pour en choisir un nouveau.
      </p>
    </div>
    <form class="space-y-4" (submit)="send($event)" novalidate>
      @if (error(); as message) {
        <div role="alert" class="rounded-2xl border border-error bg-error-subtle px-4 py-3">
          <p class="text-body-sm font-medium text-error">{{ message }}</p>
        </div>
      }
      <app-form-field
        label="Adresse e-mail"
        controlId="forgot-email"
        [field]="requestForm.email"
        [required]="true"
      >
        <input
          id="forgot-email"
          type="email"
          autocomplete="email"
          placeholder="Votre adresse e-mail"
          [class]="inputClasses"
          [formField]="requestForm.email"
        />
      </app-form-field>
      <fieldset>
        <legend class="mb-1.5 text-[13px] font-medium text-foreground-secondary">Recevoir</legend>
        <div class="grid grid-cols-2 gap-2">
          @for (option of channels; track option.value) {
            <button
              type="button"
              [class]="channelClass(option.value)"
              [attr.aria-pressed]="channel() === option.value"
              (click)="channel.set(option.value)"
            >
              <svg appIcon [name]="option.icon" class="size-4"></svg>{{ option.label }}
            </button>
          }
        </div>
        @if (channel() === 'SMS') {
          <p class="mt-2 text-caption text-foreground-muted">
            Si votre numéro n’est pas vérifié sur votre compte, le code part par e-mail.
          </p>
        }
      </fieldset>
      <button
        appButton
        type="submit"
        class="w-full"
        [disabled]="request.isPending() || !requestForm().valid()"
      >
        {{ request.isPending() ? 'Envoi…' : 'Envoyer le code' }}
      </button>
      <p class="text-center text-caption text-foreground-muted">
        Pour votre sécurité, la réponse est la même que le compte existe ou non.
      </p>
    </form>
    <a
      routerLink="/login"
      class="mt-6 flex items-center justify-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
    >
      <svg appIcon name="arrow-left" class="size-4"></svg>Retour à la connexion
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  protected readonly inputClasses = inputClasses;
  protected readonly channels = CHANNELS;
  protected readonly channel = signal<ResetChannel>('OTP');
  protected readonly model = signal({ email: '' });
  protected readonly requestForm = form(this.model, (p) => validateStandardSchema(p, schema));
  protected readonly error = signal<string | null>(null);
  protected readonly request = injectRequestPasswordResetMutation();
  private readonly flow = inject(PasswordResetStore);
  private readonly router = inject(Router);

  protected send(event: Event): void {
    event.preventDefault();
    void submit(this.requestForm, async () => {
      this.error.set(null);
      const email = this.model().email.trim();
      try {
        await this.request.mutateAsync({ email, channel: this.channel() });
        this.flow.start(email);
        void this.router.navigate(['/verify-otp'], { queryParams: { channel: this.channel() } });
      } catch (e) {
        this.error.set(problemMessage(e, "Impossible d'envoyer"));
      }
      return undefined;
    });
  }

  protected channelClass(value: ResetChannel): string {
    return cn(
      'flex h-11 items-center justify-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors',
      this.channel() === value
        ? 'border-transparent bg-primary text-primary-foreground'
        : 'border-border-strong text-foreground-secondary hover:bg-background-subtle',
    );
  }
}
