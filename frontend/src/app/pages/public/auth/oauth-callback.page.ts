import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { safeRedirect } from '@core/auth/permission.guard';
import { problemMessage } from '@core/api/api';
import { SessionService } from '@core/auth/session.service';
import { Button, Spinner } from '@shared/ui';

/**
 * The API sends the browser here after Google, Facebook or GitHub. It already set the refresh
 * cookie: restore the session and continue, or show the error it passed.
 */
@Component({
  selector: 'app-oauth-callback-page',
  imports: [Button, RouterLink, Spinner],
  template: `
    <div class="text-center">
      @if (message(); as text) {
        <h2 class="text-h3 text-foreground">Connexion impossible</h2>
        <p class="mt-2 text-body-sm leading-relaxed text-error">{{ text }}</p>
        <a appButton routerLink="/login" class="mt-8 w-full">Retour à la connexion</a>
      } @else {
        <div class="flex justify-center py-6"><app-spinner /></div>
        <h2 class="text-h3 text-foreground">Connexion en cours</h2>
        <p class="mt-2 text-body-sm text-foreground-muted">Encore un instant…</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthCallbackPage implements OnInit {
  readonly error = input<string>();
  readonly redirect = input<string>();
  protected readonly message = signal<string | null>(null);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  async ngOnInit(): Promise<void> {
    const code = this.error();
    if (code) {
      // Same French text as API errors with this code.
      this.message.set(problemMessage({ status: 400, error: { code } }, 'La connexion a échoué.'));
      return;
    }
    if (await this.session.refreshSession('customer')) {
      const target = safeRedirect(this.redirect());
      // An account just created through Google/Facebook starts with the welcome flow.
      if (this.auth.user()?.onboardingDone === false) {
        void this.router.navigate(['/onboarding'], { queryParams: { redirect: target } });
      } else {
        void this.router.navigateByUrl(target);
      }
    } else {
      this.message.set('La session n’a pas pu être ouverte. Réessayez.');
    }
  }
}
