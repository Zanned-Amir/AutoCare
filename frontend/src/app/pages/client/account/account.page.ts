import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ChangeEmailForm } from '@features/account/components/change-email-form';
import { ChangePasswordForm } from '@features/account/components/change-password-form';
import { DeactivateAccount } from '@features/account/components/deactivate-account';
import { ProfileForm } from '@features/account/components/profile-form';
import { SessionsPanel } from '@features/account/components/sessions-panel';
import { LinkedAccountsPanel } from '@features/account/components/linked-accounts-panel';
import { PhoneVerificationPanel } from '@features/account/components/phone-verification-panel';
import { TelegramPanel } from '@features/account/components/telegram-panel';
import { Card } from '@shared/ui';
import { AvatarPanel } from '@features/account/components/avatar-panel';

@Component({
  selector: 'app-account-page',
  imports: [
    AvatarPanel,
    LinkedAccountsPanel,
    PhoneVerificationPanel,
    TelegramPanel,

    Card,
    ChangeEmailForm,
    ChangePasswordForm,
    DeactivateAccount,
    ProfileForm,
    SessionsPanel,
  ],
  template: `
    <span class="text-overline text-accent-text">Paramètres</span>
    <h1 class="text-h2 text-primary">Mon compte</h1>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <app-card class="lg:col-span-2">
        <h2 class="mb-4 text-h4">Photo de profil</h2>
        <app-avatar-panel />
      </app-card>
      <app-card class="lg:col-span-2">
        <h2 class="mb-4 text-h4">Profil</h2>
        <app-profile-form />
      </app-card>
      <app-card>
        <h2 class="mb-4 text-h4">Mot de passe</h2>
        <app-change-password-form />
      </app-card>
      <app-card>
        <h2 class="mb-1 text-h4">Adresse e-mail</h2>
        <app-change-email-form />
      </app-card>
      <app-card>
        <h2 class="mb-3 text-h4">Téléphone</h2>
        <app-phone-verification-panel />
      </app-card>
      <app-card>
        <h2 class="mb-3 text-h4">Telegram</h2>
        <app-telegram-panel />
      </app-card>
      <app-card class="lg:col-span-2">
        <h2 class="mb-1 text-h4">Comptes de connexion</h2>
        <p class="mb-2 text-body-sm text-foreground-secondary">
          Connectez-vous aussi avec Google, Facebook ou GitHub.
        </p>
        <app-linked-accounts-panel />
      </app-card>
      <app-card class="lg:col-span-2">
        <h2 class="mb-1 text-h4">Appareils connectés</h2>
        <p class="mb-2 text-body-sm text-foreground-secondary">
          Déconnectez un appareil que vous ne reconnaissez pas, puis changez votre mot de passe.
        </p>
        <app-sessions-panel (signedOut)="goHome()" />
      </app-card>
      <app-card class="border-error/30 lg:col-span-2">
        <h2 class="mb-1 text-h4 text-error">Désactiver le compte</h2>
        <app-deactivate-account (deactivated)="goHome()" />
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  private readonly router = inject(Router);

  protected goHome(): void {
    void this.router.navigateByUrl('/');
  }
}
