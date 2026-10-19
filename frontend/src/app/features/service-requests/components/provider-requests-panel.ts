import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { Badge, Button, Card, Drawer, Icon, Modal, Spinner, inputClasses } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { formatMoney } from '@shared/utils/money';
import { formatNumber } from '@shared/utils/number';
import {
  injectOrganizationRequestsQuery,
  injectProviderRequestMutations,
} from '../service-requests.queries';
import {
  REQUEST_STATUSES,
  RequestStatus,
  ServiceRequest,
  ServiceRequestPermissions,
  locationLabels,
  quoteStatusLabels,
  requestStatusLabels,
} from '../service-requests.types';
import { RequestChat } from './request-chat';
import { RequestStatusBadge } from './request-status-badge';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'full' });

/** Incoming requests of the workspace, with the actions the member's role allows. */
@Component({
  selector: 'app-provider-requests-panel',
  imports: [Badge, Button, Card, Drawer, Icon, Modal, RequestChat, RequestStatusBadge, Spinner],
  template: `
    <div class="flex flex-wrap gap-2" role="tablist">
      @for (status of statuses; track status) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="filter() === status"
          [class]="tabClass(status)"
          (click)="select(status)"
        >
          {{ labels[status] }}
          <span class="ml-1 text-plate">{{ requests.counts.data()?.[status] ?? 0 }}</span>
        </button>
      }
    </div>
    @if (error(); as message) {
      <p class="mt-3 rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
        {{ message }}
      </p>
    }
    @if (requests.list.isPending()) {
      <div class="mt-4"><app-spinner /></div>
    } @else {
      <div class="mt-4 flex flex-col gap-3">
        @for (request of requests.list.data()?.content ?? []; track request.id) {
          <app-card class="flex flex-col gap-2">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="text-h4 text-foreground">{{ request.service.name }}</p>
                <p class="text-body-sm text-foreground-secondary">
                  {{ formatDate(request.desiredDate) }} · {{ locationLabels[request.locationType] }}
                  @if (request.location; as location) {
                    : {{ location }}
                  }
                </p>
              </div>
              <app-request-status-badge [status]="request.status" />
            </div>
            <div class="grid gap-2 text-body-sm sm:grid-cols-2">
              @if (request.customer; as customer) {
                <p>
                  <span class="text-foreground-muted">Client :</span> {{ customer.fullName }}
                  @if (customer.phone; as phone) {
                    · <a class="text-primary underline" [href]="'tel:' + phone">{{ phone }}</a>
                  }
                </p>
              }
              @if (request.vehicle; as vehicle) {
                <p>
                  <span class="text-foreground-muted">Véhicule :</span> {{ vehicle.brand }}
                  {{ vehicle.model }} {{ vehicle.year }} ·
                  <span class="text-plate">{{ formatNumber(vehicle.mileage) }} km</span>
                </p>
              }
            </div>
            @if (request.diagnostic?.possibleCause; as cause) {
              <p class="text-body-sm">
                <span class="text-foreground-muted">Diagnostic du client :</span> {{ cause }}
              </p>
            }
            @if (request.note; as note) {
              <p class="rounded-control bg-surface-muted px-3 py-2 text-body-sm">« {{ note }} »</p>
            }
            @if (request.quote; as quote) {
              <div
                class="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-body-sm"
              >
                <span class="text-foreground-muted">Devis :</span>
                <span class="text-price text-primary">{{ formatMoney(quote.amount) }}</span>
                <app-badge [tone]="quoteTone(quote.status)">{{
                  quoteLabels[quote.status]
                }}</app-badge>
                @if (quote.note; as note) {
                  <span class="w-full text-caption text-foreground-secondary">{{ note }}</span>
                }
              </div>
            }

            @if (acting()?.id === request.id && acting()?.kind === 'reject') {
              <div class="flex flex-wrap items-center gap-2">
                <input
                  [class]="inputClasses + ' flex-1'"
                  placeholder="Raison du refus (envoyée au client)"
                  [value]="reason()"
                  (input)="reason.set($any($event.target).value)"
                />
                <button
                  appButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  (click)="acting.set(null)"
                >
                  Annuler
                </button>
                <button
                  appButton
                  variant="danger"
                  size="sm"
                  type="button"
                  [disabled]="!reason().trim()"
                  (click)="reject(request)"
                >
                  Refuser
                </button>
              </div>
            } @else if (acting()?.id === request.id && acting()?.kind === 'complete') {
              <div class="grid gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  min="0"
                  [class]="inputClasses"
                  placeholder="Kilométrage relevé"
                  (input)="mileage.set($any($event.target).value)"
                />
                <input
                  [class]="inputClasses + ' sm:col-span-2'"
                  placeholder="Travaux réalisés"
                  (input)="result.set($any($event.target).value)"
                />
                <input
                  [class]="inputClasses + ' sm:col-span-3'"
                  placeholder="Recommandations (optionnel)"
                  (input)="recommendations.set($any($event.target).value)"
                />
                <div class="flex justify-end gap-2 sm:col-span-3">
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="acting.set(null)"
                  >
                    Annuler
                  </button>
                  <button appButton size="sm" type="button" (click)="complete(request)">
                    Terminer
                  </button>
                </div>
              </div>
            } @else {
              <div class="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-2">
                <button
                  appButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  class="mr-auto"
                  (click)="chatting.set(request)"
                >
                  <svg appIcon name="send" class="size-4"></svg>
                  Messages
                </button>
                @if (request.status === 'PENDING') {
                  @if (auth.canInOrganization(permissions.REQUEST_REJECT)) {
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="open(request, 'reject')"
                    >
                      Refuser
                    </button>
                  }
                  @if (auth.canInOrganization(permissions.REQUEST_ACCEPT)) {
                    <button
                      appButton
                      variant="secondary"
                      size="sm"
                      type="button"
                      (click)="openQuote(request)"
                    >
                      {{
                        request.quote?.status === 'SENT' ? 'Modifier le devis' : 'Envoyer un devis'
                      }}
                    </button>
                    <button
                      appButton
                      size="sm"
                      type="button"
                      (click)="run(mutations.confirm.mutateAsync(request.id))"
                    >
                      Accepter
                    </button>
                  }
                } @else if (
                  request.status === 'CONFIRMED' &&
                  auth.canInOrganization(permissions.REQUEST_UPDATE_STATUS)
                ) {
                  <button
                    appButton
                    size="sm"
                    type="button"
                    (click)="run(mutations.start.mutateAsync(request.id))"
                  >
                    Commencer
                  </button>
                } @else if (
                  request.status === 'IN_PROGRESS' &&
                  auth.canInOrganization(permissions.REQUEST_UPDATE_STATUS)
                ) {
                  <button appButton size="sm" type="button" (click)="open(request, 'complete')">
                    Terminer…
                  </button>
                } @else if (request.rejectionReason || request.cancellationReason) {
                  <p class="mr-auto text-caption text-foreground-muted">
                    {{ request.rejectionReason ?? request.cancellationReason }}
                  </p>
                }
              </div>
            }
          </app-card>
        } @empty {
          <p class="text-body-sm text-foreground-muted">
            Aucune demande {{ labels[filter()].toLowerCase() }}.
          </p>
        }
      </div>
    }

    <app-drawer
      title="Messages"
      [description]="chatting() ? chatTitle(chatting()!) : null"
      [open]="chatting() !== null"
      (closed)="chatting.set(null)"
    >
      @if (chatting(); as request) {
        <app-request-chat
          [requestId]="request.id"
          [organizationId]="organizationId()"
          [closed]="request.status === 'REJECTED' || request.status === 'CANCELLED'"
        />
      }
    </app-drawer>

    <app-modal
      title="Envoyer un devis"
      description="Le client l’accepte (la demande est alors confirmée) ou le refuse depuis son espace."
      [open]="quoting() !== null"
      (closed)="quoting.set(null)"
    >
      <form id="quote-form" class="flex flex-col gap-4" (submit)="sendQuote($event)" novalidate>
        <label class="flex flex-col gap-1.5" for="quote-amount">
          <span class="text-[13px] font-medium text-foreground-secondary"
            >Montant TTC (DT) <span class="text-error">*</span></span
          >
          <input
            id="quote-amount"
            inputmode="decimal"
            autocomplete="off"
            [class]="inputClasses + ' text-price'"
            placeholder="120,500"
            [attr.aria-invalid]="quoteAmount() !== '' && !amountValid()"
            [value]="quoteAmount()"
            (input)="quoteAmount.set($any($event.target).value)"
          />
          <span class="text-caption text-foreground-muted">Jusqu’à 3 décimales (millimes).</span>
        </label>
        <label class="flex flex-col gap-1.5" for="quote-note">
          <span class="text-[13px] font-medium text-foreground-secondary">Détail (facultatif)</span>
          <textarea
            id="quote-note"
            maxlength="1000"
            [class]="inputClasses + ' h-24 py-2'"
            placeholder="Pièces, main-d’œuvre, délai…"
            [value]="quoteNote()"
            (input)="quoteNote.set($any($event.target).value)"
          ></textarea>
        </label>
        @if (error(); as message) {
          <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
            {{ message }}
          </p>
        }
      </form>
      <button footer appButton variant="secondary" type="button" (click)="quoting.set(null)">
        Annuler
      </button>
      <button
        footer
        appButton
        type="submit"
        form="quote-form"
        [disabled]="!amountValid() || mutations.quote.isPending()"
      >
        Envoyer le devis
      </button>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderRequestsPanel {
  readonly organizationId = input.required<number>();

  protected readonly auth = inject(AuthStore);
  protected readonly permissions = ServiceRequestPermissions;
  protected readonly statuses = REQUEST_STATUSES;
  protected readonly labels = requestStatusLabels;
  protected readonly locationLabels = locationLabels;
  protected readonly inputClasses = inputClasses;
  protected readonly formatNumber = formatNumber;
  protected readonly filter = signal<RequestStatus>('PENDING');
  protected readonly page = signal(0);
  protected readonly requests = injectOrganizationRequestsQuery(
    () => this.organizationId(),
    () => this.filter(),
    () => this.page(),
  );
  protected readonly mutations = injectProviderRequestMutations(() => this.organizationId());
  protected readonly acting = signal<{ id: number; kind: 'reject' | 'complete' } | null>(null);
  protected readonly reason = signal('');
  protected readonly mileage = signal('');
  protected readonly result = signal('');
  protected readonly recommendations = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly formatMoney = formatMoney;
  protected readonly quoteLabels = quoteStatusLabels;
  protected readonly quoting = signal<ServiceRequest | null>(null);
  protected readonly chatting = signal<ServiceRequest | null>(null);

  protected chatTitle(request: ServiceRequest): string {
    return [request.service.name, request.customer?.fullName].filter(Boolean).join(' · ');
  }
  protected readonly quoteAmount = signal('');
  protected readonly quoteNote = signal('');

  /** "120,5" or "120.500": up to 6 digits and 3 decimals. */
  protected amountValid(): boolean {
    return /^\d{1,6}([.,]\d{1,3})?$/.test(this.quoteAmount().trim());
  }

  protected quoteTone(status: string): 'warning' | 'success' | 'neutral' {
    return status === 'SENT' ? 'warning' : status === 'ACCEPTED' ? 'success' : 'neutral';
  }

  protected openQuote(request: ServiceRequest): void {
    this.error.set(null);
    this.quoteAmount.set(request.quote?.amount ?? '');
    this.quoteNote.set(request.quote?.note ?? '');
    this.quoting.set(request);
  }

  protected sendQuote(event: Event): void {
    event.preventDefault();
    const request = this.quoting();
    if (!request || !this.amountValid()) return;
    this.error.set(null);
    this.mutations.quote
      .mutateAsync({
        id: request.id,
        amount: this.quoteAmount().trim().replace(',', '.'),
        note: this.quoteNote(),
      })
      .then(() => this.quoting.set(null))
      .catch((error: unknown) => this.error.set(problemMessage(error, 'Envoi impossible')));
  }

  protected select(status: RequestStatus): void {
    this.filter.set(status);
    this.page.set(0);
    this.acting.set(null);
  }

  protected open(request: ServiceRequest, kind: 'reject' | 'complete'): void {
    this.reason.set('');
    this.mileage.set('');
    this.result.set('');
    this.recommendations.set('');
    this.acting.set({ id: request.id, kind });
  }

  protected reject(request: ServiceRequest): void {
    this.run(this.mutations.reject.mutateAsync({ id: request.id, reason: this.reason().trim() }));
  }

  protected complete(request: ServiceRequest): void {
    const mileage = this.mileage() === '' ? null : Number(this.mileage());
    this.run(
      this.mutations.complete.mutateAsync({
        id: request.id,
        report: {
          mileage,
          result: this.result().trim() || null,
          recommendations: this.recommendations().trim() || null,
        },
      }),
    );
  }

  protected run(action: Promise<unknown>): void {
    this.error.set(null);
    action
      .then(() => this.acting.set(null))
      .catch((e: unknown) => this.error.set(problemMessage(e, 'Action impossible')));
  }

  protected formatDate(value: string): string {
    return dateFormat.format(new Date(value + 'T00:00:00'));
  }

  protected tabClass(status: RequestStatus): string {
    return cn(
      'rounded-full border px-3 py-1 text-body-sm',
      this.filter() === status
        ? 'border-primary bg-primary-subtle text-primary'
        : 'border-border-subtle text-foreground-secondary hover:text-foreground',
    );
  }
}
