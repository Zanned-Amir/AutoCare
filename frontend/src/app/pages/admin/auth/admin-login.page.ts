import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { LoginForm } from '@features/auth/components/login-form';

/** Staff sign-in: opens a backoffice session (separate cookie, 12 h). */
@Component({
  selector: 'app-admin-login-page',
  imports: [LoginForm, RouterLink],
  template: `
    <div class="mb-6 text-center">
      <h2 class="text-h3 text-foreground">Espace équipe</h2>
      <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
        Réservé à l’équipe AutoCare : administration et support.
      </p>
    </div>
    <app-login-form scope="backoffice" [forgotLink]="false" (loggedIn)="goNext()" />
    <a
      routerLink="/"
      class="mt-6 block text-center text-body-sm font-medium text-primary hover:underline"
      >Retour au site</a
    >
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginPage {
  readonly redirect = input<string>();
  private readonly router = inject(Router);

  protected goNext(): void {
    const target = this.redirect();
    void this.router.navigateByUrl(target?.startsWith('/admin') ? target : '/admin');
  }
}
