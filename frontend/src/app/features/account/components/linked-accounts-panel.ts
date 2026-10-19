import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { injectOAuthProvidersQuery } from '@features/auth/auth.queries';
import { Badge, Button } from '@shared/ui';
import { injectAccountLinkMutations, injectOAuthAccountsQuery } from '../account.queries';

const NAMES: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  github: 'GitHub',
  apple: 'Apple',
};

/** Sign in with Google/GitHub... linked to this account. Unlinking the only way in is refused by the API. */
@Component({
  selector: 'app-linked-accounts-panel',
  imports: [Badge, Button],
  template: `
    @if (rows().length === 0) {
      <p class="text-body-sm text-foreground-muted">
        Aucun fournisseur de connexion n'est configuré.
      </p>
    }
    <ul class="divide-y divide-border-subtle">
      @for (row of rows(); track row.provider) {
        <li class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p class="text-label text-foreground">{{ names[row.provider] ?? row.provider }}</p>
            @if (row.account; as account) {
              <p class="text-caption text-foreground-secondary">
                {{ account.email ?? account.name }}
              </p>
            }
          </div>
          @if (row.account) {
            <div class="flex items-center gap-2">
              <app-badge tone="success">Lié</app-badge>
              <button
                appButton
                variant="ghost"
                size="sm"
                type="button"
                (click)="unlink(row.provider)"
              >
                Délier
              </button>
            </div>
          } @else if (row.canLink) {
            <button
              appButton
              variant="secondary"
              size="sm"
              type="button"
              (click)="link(row.provider)"
            >
              Lier
            </button>
          }
        </li>
      }
    </ul>
    @if (!auth.user()?.passwordSet) {
      <p class="mt-2 text-caption text-warning">
        Choisissez un mot de passe ci-dessus pour pouvoir délier votre dernier compte.
      </p>
    }
    @if (error(); as message) {
      <p class="mt-2 text-body-sm text-error">{{ message }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkedAccountsPanel {
  protected readonly auth = inject(AuthStore);
  protected readonly names = NAMES;
  private readonly providers = injectOAuthProvidersQuery();
  private readonly accounts = injectOAuthAccountsQuery();
  private readonly mutations = injectAccountLinkMutations();
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const linked = this.accounts.data() ?? [];
    const enabled = this.providers.data() ?? [];
    const keys = new Set([
      ...enabled.map((p) => p.provider as string),
      ...linked.map((a) => a.provider),
    ]);
    return [...keys].map((provider) => ({
      provider,
      account: linked.find((a) => a.provider === provider) ?? null,
      canLink: enabled.some((p) => p.provider === provider && p.redirect),
    }));
  });

  protected link(provider: string): void {
    this.error.set(null);
    this.mutations.startOAuthLink.mutate(provider, {
      onSuccess: ({ url }) => (window.location.href = url),
      onError: (e) => this.error.set(problemMessage(e, 'Liaison impossible')),
    });
  }

  protected unlink(provider: string): void {
    this.error.set(null);
    this.mutations.unlinkOAuth.mutate(provider, {
      onError: (e) => this.error.set(problemMessage(e, 'Action impossible')),
    });
  }
}
