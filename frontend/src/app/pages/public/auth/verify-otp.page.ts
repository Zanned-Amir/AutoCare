import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { ResetChannel } from '@features/auth/auth.api';
import { injectRequestPasswordResetMutation } from '@features/auth/auth.queries';
import { Button, Icon, OtpInput } from '@shared/ui';
import { PasswordResetStore } from '@store/password-reset.store';

const WHERE: Record<string, string> = {
  OTP: 'par e-mail',
  SMS: 'par SMS',
  TELEGRAM: 'sur Telegram',
};

/** Step 2 of the code reset: the 6 digits (checked by the API with the new password). */
@Component({
  selector: 'app-verify-otp-page',
  imports: [Button, Icon, OtpInput, RouterLink],
  template: `
    <div class="mb-6 text-center">
      <h2 class="text-h3 text-foreground">Saisissez le code</h2>
      @if (flow.email()) {
        <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
          Nous avons envoyé un code à 6 chiffres {{ where() }} pour
          <strong class="text-foreground">{{ masked() }}</strong
          >. Il est valable 15 minutes.
        </p>
      }
    </div>
    @if (!flow.email()) {
      <p class="text-center text-body-sm text-error">La demande a expiré. Recommencez.</p>
      <a appButton routerLink="/forgot-password" class="mt-6 w-full">Recommencer</a>
    } @else {
      <form class="space-y-4" (submit)="next($event)">
        <app-otp-input [(value)]="code" />
        <button appButton type="submit" class="w-full" [disabled]="code().length !== 6">
          Continuer
        </button>
      </form>
      <div class="mt-4 space-y-1 text-center">
        <button
          type="button"
          class="text-caption font-medium text-primary hover:underline disabled:text-foreground-muted disabled:no-underline"
          [disabled]="resend.isPending()"
          (click)="again()"
        >
          Renvoyer le code
        </button>
        @if (info(); as text) {
          <p class="text-caption text-foreground-muted">{{ text }}</p>
        }
      </div>
    }
    <a
      routerLink="/forgot-password"
      class="mt-6 flex items-center justify-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
    >
      <svg appIcon name="arrow-left" class="size-4"></svg>Changer d'adresse
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyOtpPage {
  readonly channel = input<string>();

  protected readonly flow = inject(PasswordResetStore);
  protected readonly code = signal('');
  protected readonly info = signal<string | null>(null);
  protected readonly resend = injectRequestPasswordResetMutation();
  private readonly router = inject(Router);
  protected readonly where = computed(() => WHERE[this.channel() ?? 'OTP'] ?? 'par e-mail');
  protected readonly masked = computed(() => {
    const [name, domain] = this.flow.email().split('@');
    return name && domain ? name.slice(0, 2) + '•••@' + domain : this.flow.email();
  });

  protected next(event: Event): void {
    event.preventDefault();
    this.flow.setCode(this.code());
    void this.router.navigateByUrl('/reset-password');
  }

  protected again(): void {
    this.info.set(null);
    this.resend.mutate(
      { email: this.flow.email(), channel: (this.channel() as ResetChannel) ?? 'OTP' },
      {
        onSuccess: () => this.info.set('Nouveau code envoyé.'),
        onError: (e) => this.info.set(problemMessage(e, 'Renvoi impossible')),
      },
    );
  }
}
