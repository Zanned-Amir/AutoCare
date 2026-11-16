import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import {
  injectAcceptInvitationMutation,
  injectInvitationPreviewQuery,
} from '@features/organizations/organizations.queries';
import { memberRoleLabels } from '@features/organizations/organizations.types';
import { Button, Icon, Spinner } from '@shared/ui';

const closedMessages = {
  ACCEPTED: 'Cette invitation a déjà été acceptée.',
  EXPIRED: 'Cette invitation a expiré. Demandez-en une nouvelle à l’entreprise.',
  REVOKED: 'Cette invitation a été annulée par l’entreprise.',
} as const;

@Component({
  selector: 'app-invitation-page',
  imports: [Button, Icon, RouterLink, Spinner],
  template: `
    <div class="text-center">
      @if (!token()) {
        <h2 class="text-h3 text-foreground">Lien incomplet</h2>
        <p class="mt-2 text-body-sm text-error">Ouvrez le lien complet reçu par e-mail.</p>
      } @else if (preview.isPending()) {
        <div class="flex justify-center py-6"><app-spinner /></div>
      } @else if (preview.isError()) {
        <span
          class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-error-subtle text-error"
          ><svg appIcon name="mail" class="size-6"></svg
        ></span>
        <h2 class="text-h3 text-foreground">Invitation introuvable</h2>
        <p class="mt-2 text-body-sm leading-relaxed text-error">
          {{ errorMessage(preview.error(), 'Ce lien ne correspond à aucune invitation.') }}
        </p>
      } @else if (preview.data(); as invitation) {
        <span
          class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-subtle text-primary"
          ><svg appIcon name="users" class="size-6"></svg
        ></span>
        <h2 class="text-h3 text-foreground">Rejoindre {{ invitation.organizationName }}</h2>
        <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">
          Invitation envoyée à {{ invitation.email }}.
        </p>
        <p class="mt-1 text-body-sm text-foreground-secondary">
          Rôle : <strong>{{ roleLabels[invitation.roleKey] }}</strong>
        </p>

        @if (closedMessage(); as message) {
          <p class="mt-6 rounded-control bg-warning-subtle px-3 py-2 text-body-sm text-foreground">
            {{ message }}
          </p>
          <a appButton variant="secondary" routerLink="/" class="mt-6 w-full">Accueil</a>
        } @else if (!auth.isAuthenticated()) {
          <p class="mt-6 text-body-sm text-foreground-secondary">
            Connectez-vous ou créez un compte avec {{ invitation.email }} pour accepter.
          </p>
          <a
            appButton
            routerLink="/login"
            [queryParams]="{ redirect: returnUrl() }"
            class="mt-4 w-full"
            >Se connecter</a
          >
          <a
            appButton
            variant="secondary"
            routerLink="/register"
            [queryParams]="{ redirect: returnUrl() }"
            class="mt-3 w-full"
            >Créer un compte</a
          >
        } @else if (!sameEmail()) {
          <p class="mt-6 rounded-control bg-warning-subtle px-3 py-2 text-body-sm text-foreground">
            Vous êtes connecté avec {{ auth.user()?.email }}. Déconnectez-vous puis connectez-vous
            avec {{ invitation.email }} pour accepter.
          </p>
        } @else {
          @if (accept.isError()) {
            <p class="mt-6 rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
              {{ errorMessage(accept.error(), 'Impossible de rejoindre l’entreprise') }}
            </p>
          }
          <button
            appButton
            type="button"
            class="mt-6 w-full"
            [disabled]="accept.isPending()"
            (click)="acceptInvitation()"
          >
            Rejoindre l’équipe
          </button>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationPage {
  /** ?token= from the e-mail link, bound by withComponentInputBinding(). */
  readonly token = input<string>();

  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly roleLabels = memberRoleLabels;
  protected readonly preview = injectInvitationPreviewQuery(() => this.token());
  protected readonly accept = injectAcceptInvitationMutation();

  protected readonly returnUrl = computed(
    () => '/invitations?token=' + encodeURIComponent(this.token() ?? ''),
  );
  protected readonly closedMessage = computed(() => {
    const status = this.preview.data()?.status;
    return status && status !== 'PENDING' ? closedMessages[status] : null;
  });
  protected readonly sameEmail = computed(
    () => this.auth.user()?.email.toLowerCase() === this.preview.data()?.email.toLowerCase(),
  );

  protected errorMessage(error: unknown, fallback: string): string {
    return problemMessage(error, fallback);
  }

  protected acceptInvitation(): void {
    const token = this.token();
    if (!token) return;
    this.accept.mutate(token, {
      onSuccess: (joined) => void this.router.navigate(['/pro', joined.organizationId]),
    });
  }
}
