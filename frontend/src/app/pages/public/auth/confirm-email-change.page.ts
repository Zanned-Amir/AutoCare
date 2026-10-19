import { ChangeDetectionStrategy, Component, OnInit, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { injectConfirmEmailTokenMutation } from '@features/auth/auth.queries';
import { Button, Icon, Spinner } from '@shared/ui';

@Component({
  selector: 'app-confirm-email-change-page',
  imports: [Button, Icon, RouterLink, Spinner],
  template: `
    <div class="text-center">
      @if (confirm.isPending()) {
        <div class="flex justify-center py-6"><app-spinner /></div>
        <p class="text-body-sm text-foreground-muted">Vérification en cours…</p>
      } @else if (confirm.isSuccess()) {
        <span
          class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success-subtle text-success"
          ><svg appIcon name="circle-check" class="size-7"></svg
        ></span>
        <h2 class="text-h3 text-foreground">Nouvelle adresse confirmée</h2>
        <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
          Votre adresse e-mail a été changée. Utilisez-la pour vos prochaines connexions.
        </p>
        <a appButton routerLink="/account" class="mt-8 w-full">Mon compte</a>
      } @else {
        <span
          class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-error-subtle text-error"
          ><svg appIcon name="mail" class="size-6"></svg
        ></span>
        <h2 class="text-h3 text-foreground">Lien invalide</h2>
        <p class="mt-2 text-body-sm leading-relaxed text-error">{{ error() }}</p>
        <a appButton variant="secondary" routerLink="/account" class="mt-8 w-full">Mon compte</a>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmEmailChangePage implements OnInit {
  /** ?token= from the e-mail link, bound by withComponentInputBinding(). */
  readonly token = input<string>();
  protected readonly confirm = injectConfirmEmailTokenMutation('change');
  protected readonly error = signal(
    'Ce lien est incomplet. Demandez-en un nouveau depuis votre compte.',
  );

  ngOnInit(): void {
    const token = this.token();
    if (!token) return;
    this.confirm.mutate(token, {
      onError: (error) => this.error.set(problemMessage(error, 'Confirmation impossible')),
    });
  }
}
