import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { Button } from '@shared/ui';
import { injectSendEmailVerificationMutation } from '../account.queries';

/** Shown to signed-in users whose e-mail is not confirmed yet. */
@Component({
  selector: 'app-email-verification-banner',
  imports: [Button],
  template: `
    @if (auth.user(); as user) {
      @if (!user.emailVerified) {
        <div class="border-b border-border-subtle bg-warning-subtle">
          <div
            class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-body-sm text-warning"
          >
            <span>
              @if (message(); as text) {
                {{ text }}
              } @else {
                Confirmez votre adresse <strong>{{ user.email }}</strong> avec le lien reçu par
                e-mail.
              }
            </span>
            <button
              appButton
              variant="ghost"
              size="sm"
              type="button"
              [disabled]="send.isPending()"
              (click)="resend()"
            >
              Renvoyer l'e-mail
            </button>
          </div>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailVerificationBanner {
  protected readonly auth = inject(AuthStore);
  protected readonly send = injectSendEmailVerificationMutation();
  protected readonly message = signal<string | null>(null);

  protected resend(): void {
    this.send.mutate(undefined, {
      onSuccess: () =>
        this.message.set('E-mail envoyé. Pensez à vérifier vos courriers indésirables.'),
      onError: (error) => this.message.set(problemMessage(error, "Impossible d'envoyer l'e-mail")),
    });
  }
}
