import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

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
    <app-register-form (registered)="router.navigateByUrl('/onboarding')" />
    <app-oauth-buttons class="mt-6" intent="register" redirect="/vehicles" />
    <p class="mt-6 text-center text-body-sm text-foreground-secondary">
      Déjà un compte ?
      <a routerLink="/login" class="font-semibold text-primary hover:underline">Se connecter</a>
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  protected readonly router = inject(Router);
}
