import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { safeRedirect } from '@core/auth/permission.guard';
import { OAuthButtons } from '@features/auth/components/oauth-buttons';
import { RegisterForm } from '@features/auth/components/register-form';

@Component({
  selector: 'app-register-page',
  imports: [OAuthButtons, RegisterForm, RouterLink],
  template: `
    <div class="mb-6 text-center">
      <h2 class="text-h3 text-foreground">Créer un compte</h2>
      <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
        Gratuit, sans engagement. Un e-mail de confirmation vous sera envoyé.
      </p>
    </div>
    <app-register-form (registered)="goNext()" />
    <app-oauth-buttons class="mt-6" intent="register" [redirect]="target() ?? '/vehicles'" />
    <p class="mt-6 text-center text-body-sm text-foreground-secondary">
      Déjà un compte ?
      <a
        routerLink="/login"
        [queryParams]="{ redirect: target() }"
        class="font-semibold text-primary hover:underline"
        >Se connecter</a
      >
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  /** ?redirect= (an invitation link, for example), bound by withComponentInputBinding(). */
  readonly redirect = input<string>();
  private readonly router = inject(Router);

  protected target(): string | undefined {
    return this.redirect() ? safeRedirect(this.redirect()) : undefined;
  }

  /** A new account goes through the welcome flow first, then where it was headed. */
  protected goNext(): void {
    const target = this.target();
    void this.router.navigate(['/onboarding'], target ? { queryParams: { redirect: target } } : {});
  }
}
