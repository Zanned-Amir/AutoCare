import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { NewPasswordForm } from '@features/auth/components/new-password-form';
import { Button, Icon } from '@shared/ui';
import { PasswordResetStore } from '@store/password-reset.store';

/** Step 3: the new password, with the link token (?token=) or the code typed on /verify-otp. */
@Component({
  selector: 'app-reset-password-page',
  imports: [Button, Icon, NewPasswordForm, RouterLink],
  template: `
    <div class="mb-6 text-center">
      <h2 class="text-h3 text-foreground">Nouveau mot de passe</h2>
      <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
        Tous vos appareils seront déconnectés.
      </p>
    </div>
    @if (!token() && !flow.code()) {
      <p class="text-center text-body-sm text-error">Ce lien est incomplet ou a expiré.</p>
      <a appButton routerLink="/forgot-password" class="mt-6 w-full">Demander un nouveau lien</a>
    } @else {
      <app-new-password-form
        [token]="token() ?? null"
        [email]="flow.email()"
        [code]="flow.code()"
        (done)="finish()"
        (failed)="codeRejected.set(!token())"
      />
      @if (codeRejected()) {
        <a
          routerLink="/verify-otp"
          class="mt-4 flex items-center justify-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
        >
          <svg appIcon name="arrow-left" class="size-4"></svg>Ressaisir le code
        </a>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  /** ?token= from the e-mail link, bound by withComponentInputBinding(). */
  readonly token = input<string>();
  protected readonly flow = inject(PasswordResetStore);
  protected readonly codeRejected = signal(false);
  private readonly router = inject(Router);
  protected readonly hasCode = computed(() => !!this.flow.code());

  protected finish(): void {
    this.flow.clear();
    void this.router.navigate(['/auth-success'], { queryParams: { kind: 'password' } });
  }
}
