import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { Badge, Button, Spinner } from '@shared/ui';
import { injectAccountLinkMutations, injectTelegramStatusQuery } from '../account.queries';

/** Links a Telegram chat with a deep link (t.me/bot?start=code); security codes can then be sent there. */
@Component({
  selector: 'app-telegram-panel',
  imports: [Badge, Button, Spinner],
  template: `
    @if (status.isPending()) {
      <app-spinner />
    } @else if (status.data(); as current) {
      @if (!current.enabled) {
        <p class="text-body-sm text-foreground-muted">
          Telegram n'est pas configuré sur ce serveur.
        </p>
      } @else if (current.linked) {
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="flex items-center gap-2 text-body-sm">
            <app-badge tone="success">Lié</app-badge>
            @if (current.username) {
              <span>@{{ current.username }}</span>
            }
          </p>
          <button appButton variant="ghost" size="sm" type="button" (click)="unlink()">
            Délier
          </button>
        </div>
      } @else if (linkUrl(); as url) {
        <p class="text-body-sm text-foreground-secondary">
          Ouvrez ce lien dans Telegram puis appuyez sur <strong>Démarrer</strong> (valable 10
          minutes) :
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <a appButton size="sm" [href]="url" target="_blank" rel="noopener">Ouvrir Telegram</a>
          <button appButton variant="ghost" size="sm" type="button" (click)="status.refetch()">
            J'ai appuyé sur Démarrer
          </button>
        </div>
      } @else {
        <p class="text-body-sm text-foreground-secondary">
          Recevez vos codes de sécurité sur Telegram.
        </p>
        <button
          appButton
          variant="secondary"
          size="sm"
          class="mt-3"
          type="button"
          (click)="createLink()"
        >
          Lier Telegram
        </button>
      }
    }
    @if (error(); as message) {
      <p class="mt-2 text-body-sm text-error">{{ message }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelegramPanel {
  protected readonly status = injectTelegramStatusQuery();
  private readonly mutations = injectAccountLinkMutations();
  protected readonly linkUrl = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected createLink(): void {
    this.mutations.createTelegramLink.mutate(undefined, {
      onSuccess: ({ url }) => this.linkUrl.set(url),
      onError: (e) => this.error.set(problemMessage(e, 'Telegram indisponible')),
    });
  }

  protected unlink(): void {
    this.linkUrl.set(null);
    this.mutations.unlinkTelegram.mutate(undefined, {
      onError: (e) => this.error.set(problemMessage(e, 'Action impossible')),
    });
  }
}
