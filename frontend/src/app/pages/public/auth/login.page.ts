import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { safeRedirect } from '@core/auth/permission.guard';
import { LoginForm } from '@features/auth/components/login-form';
import { OAuthButtons } from '@features/auth/components/oauth-buttons';

@Component({
  selector: 'app-login-page',
  imports: [LoginForm, OAuthButtons, RouterLink],
  template: `
    <div class="mb-6 text-center">
      <h2 class="text-h3 text-foreground">Connexion</h2>
    </div>
    <app-login-form (loggedIn)="goNext()" />
    <app-oauth-buttons class="mt-6" intent="login" [redirect]="safeRedirect()" />
    <p class="mt-6 text-center text-body-sm text-foreground-secondary">
      Pas de compte ?
      <a routerLink="/register" class="font-semibold text-primary hover:underline">S'inscrire</a>
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  /** Bound from the ?redirect= query param by withComponentInputBinding(). */
  readonly redirect = input<string>();
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  protected safeRedirect(): string {
    return safeRedirect(this.redirect());
  }

  /** A new account goes through the welcome flow first, then where it was headed. */
  protected goNext(): void {
    const target = this.safeRedirect();
    if (this.auth.user()?.onboardingDone === false) {
      void this.router.navigate(['/onboarding'], { queryParams: { redirect: target } });
    } else {
      void this.router.navigateByUrl(target);
    }
  }
}
