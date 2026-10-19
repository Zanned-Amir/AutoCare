import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { AvatarPanel } from '@features/account/components/avatar-panel';
import { ChangeEmailForm } from '@features/account/components/change-email-form';
import { ChangePasswordForm } from '@features/account/components/change-password-form';
import { PhoneVerificationPanel } from '@features/account/components/phone-verification-panel';
import { ProfileForm } from '@features/account/components/profile-form';
import { SessionsPanel } from '@features/account/components/sessions-panel';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { Badge, Card } from '@shared/ui';

/**
 * "Mon profil" inside the backoffice: the staff session is separate from the site one, so
 * sending staff to /account would ask them to sign in again. Deactivation stays on the site.
 */
@Component({
  selector: 'app-admin-profile-page',
  imports: [
    AdminPageHeader,
    AvatarPanel,
    Badge,
    Card,
    ChangeEmailForm,
    ChangePasswordForm,
    PhoneVerificationPanel,
    ProfileForm,
    SessionsPanel,
  ],
  template: `
    <app-admin-page-header
      title="Mon profil"
      subtitle="Vos informations, votre mot de passe et vos appareils connectés."
    ></app-admin-page-header>
    <div class="grid gap-6 px-4 py-5 md:px-8 md:py-8 xl:grid-cols-[2fr_3fr]">
      <div class="flex flex-col gap-6">
        <app-card class="flex flex-col gap-4">
          <h2 class="text-h4">Photo de profil</h2>
          <app-avatar-panel />
        </app-card>
        <app-card class="flex flex-col gap-3">
          <h2 class="text-h4">Accès backoffice</h2>
          <div class="flex flex-wrap gap-2">
            @for (role of auth.user()?.roles ?? []; track role) {
              <app-badge tone="info">{{ role }}</app-badge>
            }
          </div>
          <p class="text-caption text-foreground-muted">
            Les rôles sont attribués par un administrateur (Rôles &amp; permissions).
          </p>
        </app-card>
      </div>
      <div class="flex flex-col gap-6">
        <app-card>
          <h2 class="mb-4 text-h4">Informations</h2>
          <app-profile-form />
        </app-card>
        <div class="grid gap-6 lg:grid-cols-2">
          <app-card>
            <h2 class="mb-4 text-h4">Mot de passe</h2>
            <app-change-password-form />
          </app-card>
          <app-card>
            <h2 class="mb-1 text-h4">Adresse e-mail</h2>
            <app-change-email-form />
          </app-card>
        </div>
        <app-card>
          <h2 class="mb-3 text-h4">Téléphone</h2>
          <app-phone-verification-panel />
        </app-card>
        <app-card>
          <h2 class="mb-1 text-h4">Appareils connectés</h2>
          <p class="mb-2 text-body-sm text-foreground-secondary">
            Déconnectez un appareil que vous ne reconnaissez pas, puis changez votre mot de passe.
          </p>
          <app-sessions-panel (signedOut)="toLogin()" />
        </app-card>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProfilePage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected toLogin(): void {
    void this.router.navigate(['/admin/login']);
  }
}
