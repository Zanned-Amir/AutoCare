import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { injectRequestPasswordResetMutation } from '@features/auth/auth.queries';
import { Button, Icon } from '@shared/ui';

@Component({
  selector: 'app-reset-link-sent-page',
  imports: [Button, Icon, RouterLink],
  template: `
    <div class="text-center">
      <span
        class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-subtle text-primary"
        ><svg appIcon name="mail" class="size-6"></svg
      ></span>
      <h2 class="text-h3 text-foreground">E-mail envoyé</h2>
      <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
        Si un compte existe pour
        <strong class="text-foreground">{{ email() ?? 'cette adresse' }}</strong
        >, vous recevrez un lien valable 15 minutes.
      </p>
      <a appButton routerLink="/login" class="mt-8 w-full">Retour à la connexion</a>
      @if (sent()) {
        <p class="mt-3 text-body-sm text-success">Nouveau lien envoyé.</p>
      } @else if (error(); as message) {
        <p class="mt-3 text-body-sm text-error">{{ message }}</p>
      }
      @if (email()) {
        <button
          type="button"
          class="mt-5 text-body-sm font-medium text-primary hover:underline disabled:text-foreground-muted disabled:no-underline"
          [disabled]="resend.isPending()"
          (click)="again()"
        >
          Renvoyer le lien
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetLinkSentPage {
  readonly email = input<string>();
  protected readonly resend = injectRequestPasswordResetMutation();
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected again(): void {
    this.sent.set(false);
    this.error.set(null);
    this.resend.mutate(
      { email: this.email()!, channel: 'LINK' },
      {
        onSuccess: () => this.sent.set(true),
        onError: (e) => this.error.set(problemMessage(e, 'Renvoi impossible')),
      },
    );
  }
}
