import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import {
  injectApiCapabilitiesQuery,
  injectApiKeyMutations,
  injectApiKeyUsageQuery,
  injectApiKeysQuery,
} from '@features/api-keys/api-keys.queries';
import { ApiKey } from '@features/api-keys/api-keys.types';
import { formatDateTime } from '@features/helpdesk/helpdesk.format';
import { Badge, Button, Card, Spinner, inputClasses, Select, SelectOption } from '@shared/ui';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

/** Partner API keys: the full key is shown once, at creation or rotation. */
@Component({
  selector: 'app-admin-api-keys-page',
  imports: [Select, SelectOption, AdminPageHeader, Badge, Button, Card, Spinner],
  template: `
    <app-admin-page-header
      title="Clés API"
      subtitle="Accès partenaires à /api/external/v1 avec l’en-tête X-Api-Key."
    >
      @if (!creating()) {
        <button appButton actions type="button" (click)="creating.set(true)">Nouvelle clé</button>
      }
    </app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (secret(); as key) {
        <app-card class="mt-6 border-signal-500">
          <h2 class="text-h4">Copiez cette clé maintenant</h2>
          <p class="text-body-sm text-foreground-secondary">Elle ne sera plus jamais affichée.</p>
          <p class="mt-3 select-all break-all rounded-control bg-surface-muted p-3 text-plate">
            {{ key }}
          </p>
          <div class="mt-3 flex gap-2">
            <button appButton size="sm" type="button" (click)="copy(key)">
              {{ copied() ? 'Copiée' : 'Copier' }}
            </button>
            <button appButton variant="ghost" size="sm" type="button" (click)="secret.set(null)">
              J'ai copié la clé
            </button>
          </div>
        </app-card>
      }

      @if (creating()) {
        <app-card class="mt-6 max-w-2xl">
          <h2 class="mb-4 text-h4">Nouvelle clé</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5 sm:col-span-2"
              ><span class="text-label">Nom du partenaire</span>
              <input
                [class]="inputClasses"
                [value]="label()"
                (input)="label.set($any($event.target).value)"
                placeholder="Assurances Star"
            /></label>
            <label class="flex flex-col gap-1.5"
              ><span class="text-label">Environnement</span>
              <app-select (valueChange)="environment.set($event)">
                <app-option value="LIVE">Production</app-option>
                <app-option value="TEST">Test</app-option>
              </app-select></label
            >
            <label class="flex flex-col gap-1.5"
              ><span class="text-label">Requêtes par minute</span>
              <input
                type="number"
                min="1"
                [class]="inputClasses"
                [value]="rate()"
                (input)="rate.set(+$any($event.target).value)"
            /></label>
            <fieldset class="flex flex-col gap-2 sm:col-span-2">
              <legend class="mb-1 text-label">Permissions</legend>
              @for (c of capabilities.data() ?? []; track c.permission) {
                <label class="flex items-start gap-2 text-body-sm">
                  <input
                    type="checkbox"
                    class="mt-0.5 size-4 accent-primary"
                    [checked]="permissions().includes(c.permission)"
                    (change)="toggle(c.permission)"
                  />
                  <span
                    ><span class="text-plate">{{ c.permission }}</span> — {{ c.description }}</span
                  >
                </label>
              }
            </fieldset>
            <label class="flex flex-col gap-1.5 sm:col-span-2"
              ><span class="text-label">IP autorisées (optionnel, séparées par des virgules)</span>
              <input
                [class]="inputClasses"
                [value]="ips()"
                (input)="ips.set($any($event.target).value)"
                placeholder="41.226.0.0/16, 197.0.0.10"
            /></label>
          </div>
          @if (error(); as message) {
            <p class="mt-3 text-body-sm text-error">{{ message }}</p>
          }
          <div class="mt-4 flex justify-end gap-2">
            <button appButton variant="ghost" type="button" (click)="creating.set(false)">
              Annuler
            </button>
            <button appButton type="button" [disabled]="!canCreate()" (click)="create()">
              Créer la clé
            </button>
          </div>
        </app-card>
      }

      <app-card class="mt-6 p-0">
        @if (apiKeys.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else {
          <ul class="divide-y divide-border-subtle">
            @for (k of apiKeys.data()?.content ?? []; track k.id) {
              <li class="px-4 py-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-label text-foreground">
                      {{ k.label }}
                      <span class="text-plate text-foreground-muted">{{ k.displayPrefix }}</span>
                    </p>
                    <p class="text-caption text-foreground-muted">
                      {{ k.permissions.join(', ') }} · {{ k.rateLimitPerMinute }}/min · utilisée
                      {{ format(k.lastUsedAt) }}
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <app-badge
                      [tone]="
                        k.status === 'ACTIVE'
                          ? 'success'
                          : k.status === 'DISABLED'
                            ? 'warning'
                            : 'neutral'
                      "
                      >{{ statusLabel(k) }}</app-badge
                    >
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="usageFor.set(usageFor() === k.id ? null : k.id)"
                    >
                      Usage
                    </button>
                    @if (k.status !== 'REVOKED') {
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="toggleStatus(k)"
                      >
                        {{ k.status === 'ACTIVE' ? 'Désactiver' : 'Activer' }}
                      </button>
                      <button
                        appButton
                        variant="secondary"
                        size="sm"
                        type="button"
                        (click)="rotate(k)"
                      >
                        Régénérer
                      </button>
                      <button
                        appButton
                        variant="danger"
                        size="sm"
                        type="button"
                        (click)="revoke(k)"
                      >
                        Révoquer
                      </button>
                    }
                  </div>
                </div>
                @if (usageFor() === k.id) {
                  <div class="mt-3 rounded-control bg-surface-muted p-3 text-caption">
                    @for (u of usage.data() ?? []; track u.day) {
                      <p>{{ u.day }} : {{ u.requests }} requêtes, {{ u.rejected }} refusées</p>
                    } @empty {
                      <p>Aucun appel sur 30 jours.</p>
                    }
                  </div>
                }
              </li>
            } @empty {
              <li class="px-4 py-6 text-body-sm text-foreground-muted">Aucune clé.</li>
            }
          </ul>
        }
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminApiKeysPage {
  protected readonly inputClasses = inputClasses;
  protected readonly format = formatDateTime;
  protected readonly apiKeys = injectApiKeysQuery();
  protected readonly capabilities = injectApiCapabilitiesQuery();
  private readonly mutations = injectApiKeyMutations();
  protected readonly usageFor = signal<number | null>(null);
  protected readonly usage = injectApiKeyUsageQuery(() => this.usageFor());

  protected readonly creating = signal(false);
  protected readonly label = signal('');
  protected readonly environment = signal<'LIVE' | 'TEST'>('LIVE');
  protected readonly rate = signal(60);
  protected readonly permissions = signal<string[]>(['status:read']);
  protected readonly ips = signal('');
  protected readonly secret = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly canCreate = computed(
    () =>
      this.label().trim().length > 0 &&
      this.permissions().length > 0 &&
      this.rate() > 0 &&
      !this.mutations.create.isPending(),
  );

  protected toggle(permission: string): void {
    this.permissions.update((list) =>
      list.includes(permission) ? list.filter((p) => p !== permission) : [...list, permission],
    );
  }

  protected create(): void {
    this.error.set(null);
    this.mutations.create.mutate(
      {
        label: this.label(),
        environment: this.environment(),
        permissions: this.permissions(),
        allowedIps: this.ips()
          .split(',')
          .map((ip) => ip.trim())
          .filter(Boolean),
        rateLimitPerMinute: this.rate(),
      },
      {
        onSuccess: ({ key }) => {
          this.showSecret(key);
          this.creating.set(false);
          this.label.set('');
        },
        onError: (e) => this.error.set(problemMessage(e, 'Création impossible')),
      },
    );
  }

  protected rotate(k: ApiKey): void {
    if (!window.confirm(`Régénérer la clé de ${k.label} ? L'ancienne reste valable 24 h.`)) return;
    this.mutations.rotate.mutate(k.id, { onSuccess: ({ key }) => this.showSecret(key) });
  }

  protected revoke(k: ApiKey): void {
    const reason = window.prompt(`Révoquer la clé de ${k.label} ? Raison :`);
    if (reason === null) return;
    this.mutations.revoke.mutate({ id: k.id, reason });
  }

  protected toggleStatus(k: ApiKey): void {
    this.mutations.setStatus.mutate({
      id: k.id,
      status: k.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    });
  }

  protected statusLabel(k: ApiKey): string {
    return k.status === 'ACTIVE' ? 'Active' : k.status === 'DISABLED' ? 'Désactivée' : 'Révoquée';
  }

  protected copy(key: string): void {
    void navigator.clipboard?.writeText(key).then(() => this.copied.set(true));
  }

  private showSecret(key: string): void {
    this.copied.set(false);
    this.secret.set(key);
  }
}
