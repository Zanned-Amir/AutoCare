import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { Badge, Button, Spinner } from '@shared/ui';
import { injectSessionMutations, injectSessionsQuery } from '../account.queries';
import { UserSession } from '../account.types';

const dateFormat = new Intl.DateTimeFormat('fr-TN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
});

/** Devices signed in to the account, with sign-out per device or everywhere. */
@Component({
  selector: 'app-sessions-panel',
  imports: [Badge, Button, Spinner],
  template: `
    @if (sessions.isPending()) {
      <app-spinner />
    } @else if (sessions.isError()) {
      <p class="text-body-sm text-error">Impossible de charger vos appareils.</p>
    } @else {
      <ul class="divide-y divide-border-subtle">
        @for (session of sessions.data(); track session.id) {
          <li class="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p class="flex items-center gap-2 text-label text-foreground">
                {{ session.device }}
                @if (session.current) {
                  <app-badge tone="success">Cet appareil</app-badge>
                }
              </p>
              <p class="text-caption text-foreground-secondary">
                Connecté le {{ format(session.startedAt) }} · actif le
                {{ format(session.lastActiveAt) }}
                @if (session.ipAddress) {
                  · IP {{ session.ipAddress }}
                }
              </p>
            </div>
            @if (!session.current) {
              <button appButton variant="ghost" size="sm" type="button" (click)="revoke(session)">
                Déconnecter
              </button>
            }
          </li>
        }
      </ul>
      @if (error(); as message) {
        <p class="mt-2 text-body-sm text-error">{{ message }}</p>
      }
      <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
        @if (otherCount() > 0) {
          <button appButton variant="secondary" size="sm" type="button" (click)="revokeOthers()">
            Déconnecter les autres appareils
          </button>
        }
        <button appButton variant="ghost" size="sm" type="button" (click)="logoutEverywhere()">
          Se déconnecter partout
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsPanel {
  readonly signedOut = output<void>();

  protected readonly sessions = injectSessionsQuery();
  private readonly mutations = injectSessionMutations();
  protected readonly error = signal<string | null>(null);
  protected readonly otherCount = computed(
    () => (this.sessions.data() ?? []).filter((s) => !s.current).length,
  );

  protected format(value: string): string {
    return dateFormat.format(new Date(value));
  }

  protected revoke(session: UserSession): void {
    this.mutations.revoke.mutate(session.id, {
      onError: (e) => this.error.set(problemMessage(e, 'Action impossible')),
    });
  }

  protected revokeOthers(): void {
    this.mutations.revokeOthers.mutate(undefined, {
      onError: (e) => this.error.set(problemMessage(e, 'Action impossible')),
    });
  }

  protected logoutEverywhere(): void {
    this.mutations.logoutEverywhere.mutate(undefined, {
      onSuccess: () => this.signedOut.emit(),
      onError: (e) => this.error.set(problemMessage(e, 'Action impossible')),
    });
  }
}
