import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { Badge, Button, inputClasses } from '@shared/ui';
import { injectAccountLinkMutations } from '../account.queries';

/** Verifies the profile phone number with an SMS code (needed for SMS password resets). */
@Component({
  selector: 'app-phone-verification-panel',
  imports: [Badge, Button],
  template: `
    @if (auth.user(); as user) {
      @if (!user.phone) {
        <p class="text-body-sm text-foreground-muted">
          Ajoutez un numéro dans votre profil pour le vérifier.
        </p>
      } @else if (user.phoneVerified) {
        <p class="flex items-center gap-2 text-body-sm">
          <span class="text-plate">{{ user.phone }}</span>
          <app-badge tone="success">Vérifié</app-badge>
        </p>
      } @else {
        <p class="flex items-center gap-2 text-body-sm">
          <span class="text-plate">{{ user.phone }}</span>
          <app-badge tone="warning">Non vérifié</app-badge>
        </p>
        @if (!sent()) {
          <button
            appButton
            variant="secondary"
            size="sm"
            class="mt-3"
            type="button"
            [disabled]="mutations.sendPhoneCode.isPending()"
            (click)="send()"
          >
            Recevoir un code par SMS
          </button>
        } @else {
          <div class="mt-3 flex flex-wrap items-end gap-2">
            <label class="flex flex-col gap-1.5">
              <span class="text-label">Code reçu</span>
              <input
                [class]="inputClasses + ' w-36 text-plate'"
                inputmode="numeric"
                maxlength="6"
                autocomplete="one-time-code"
                [value]="code()"
                (input)="code.set($any($event.target).value)"
              />
            </label>
            <button
              appButton
              size="sm"
              type="button"
              [disabled]="code().length !== 6 || mutations.confirmPhone.isPending()"
              (click)="confirm()"
            >
              Vérifier
            </button>
          </div>
        }
      }
    }
    @if (message(); as text) {
      <p class="mt-2 text-body-sm" [class]="failed() ? 'text-error' : 'text-foreground-secondary'">
        {{ text }}
      </p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneVerificationPanel {
  protected readonly auth = inject(AuthStore);
  protected readonly inputClasses = inputClasses;
  protected readonly mutations = injectAccountLinkMutations();
  protected readonly sent = signal(false);
  protected readonly code = signal('');
  protected readonly message = signal<string | null>(null);
  protected readonly failed = signal(false);

  protected send(): void {
    this.mutations.sendPhoneCode.mutate(undefined, {
      onSuccess: () => {
        this.sent.set(true);
        this.failed.set(false);
        this.message.set('Code envoyé. Il est valable 10 minutes.');
      },
      onError: (e) => this.fail(problemMessage(e, "Impossible d'envoyer le SMS")),
    });
  }

  protected confirm(): void {
    this.mutations.confirmPhone.mutate(this.code(), {
      onSuccess: () => this.message.set(null),
      onError: (e) => this.fail(problemMessage(e, 'Code incorrect')),
    });
  }

  private fail(text: string): void {
    this.failed.set(true);
    this.message.set(text);
  }
}
