import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { ReviewCard } from '@features/reviews/components/review-card';
import { ReviewForm } from '@features/reviews/components/review-form';
import { injectMyReviewQuery } from '@features/reviews/reviews.queries';
import { RequestStatusBadge } from '@features/service-requests/components/request-status-badge';
import { RequestChat } from '@features/service-requests/components/request-chat';
import { RequestTimeline } from '@features/service-requests/components/request-timeline';
import {
  injectCancelRequestMutation,
  injectMyRequestQuery,
  injectQuoteAnswerMutations,
} from '@features/service-requests/service-requests.queries';
import { locationLabels } from '@features/service-requests/service-requests.types';
import { Button, Card, Spinner, inputClasses } from '@shared/ui';
import { formatMoney } from '@shared/utils/money';
import { formatNumber } from '@shared/utils/number';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'full' });

@Component({
  selector: 'app-request-detail-page',
  imports: [
    Button,
    Card,
    RequestChat,
    RequestStatusBadge,
    RequestTimeline,
    ReviewCard,
    ReviewForm,
    RouterLink,
    Spinner,
  ],
  template: `
    <a routerLink="/requests" class="text-body-sm text-primary hover:underline">← Mes demandes</a>
    @if (data.request.isPending()) {
      <div class="mt-6"><app-spinner /></div>
    } @else if (data.request.data(); as request) {
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <h1 class="text-h2 text-primary">{{ request.service.name }}</h1>
        <app-request-status-badge [status]="request.status" />
      </div>
      <p class="text-body-sm text-foreground-secondary">
        <a class="text-primary underline" [routerLink]="['/providers', request.organization?.id]">{{
          request.organization?.name
        }}</a>
        · {{ request.organization?.city }}
      </p>

      <div class="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <app-card class="flex flex-col gap-3">
          <p>
            <span class="text-foreground-muted">Date souhaitée :</span>
            {{ format(request.desiredDate) }}
          </p>
          <p>
            <span class="text-foreground-muted">Lieu :</span>
            {{ locationLabels[request.locationType] }}
            @if (request.location; as location) {
              — {{ location }}
            }
          </p>
          @if (request.vehicle; as vehicle) {
            <p>
              <span class="text-foreground-muted">Véhicule :</span>
              <a class="text-primary underline" [routerLink]="['/vehicles', vehicle.id]"
                >{{ vehicle.brand }} {{ vehicle.model }}</a
              >
              · <span class="text-plate">{{ formatNumber(vehicle.mileage) }} km</span>
            </p>
          }
          @if (request.diagnostic?.possibleCause; as cause) {
            <p><span class="text-foreground-muted">Diagnostic joint :</span> {{ cause }}</p>
          }
          @if (request.note; as note) {
            <p class="rounded-control bg-surface-muted px-3 py-2 text-body-sm">« {{ note }} »</p>
          }
          @if (request.rejectionReason; as reason) {
            <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
              Refusée : {{ reason }}
            </p>
          }
          @if (request.quote; as quote) {
            <div
              [class]="
                quote.status === 'SENT'
                  ? 'flex flex-col gap-3 rounded-2xl border-[1.5px] border-accent bg-signal-50 p-4 dark:bg-primary-subtle'
                  : 'flex flex-col gap-2 rounded-2xl border border-border-subtle p-4'
              "
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-label text-foreground">
                  @if (quote.status === 'SENT') {
                    Devis du garage
                  } @else if (quote.status === 'ACCEPTED') {
                    Devis accepté
                  } @else {
                    Devis refusé
                  }
                </p>
                <span class="text-h4 text-primary">{{ formatMoney(quote.amount) }}</span>
              </div>
              @if (quote.note; as note) {
                <p class="text-body-sm text-foreground-secondary">{{ note }}</p>
              }
              @if (quote.status === 'SENT' && request.status === 'PENDING') {
                <div class="flex flex-wrap gap-2">
                  <button
                    appButton
                    variant="accent"
                    size="sm"
                    type="button"
                    [disabled]="quoteAnswer.accept.isPending()"
                    (click)="answerQuote(request.id, true)"
                  >
                    Accepter le devis
                  </button>
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    [disabled]="quoteAnswer.decline.isPending()"
                    (click)="answerQuote(request.id, false)"
                  >
                    Refuser
                  </button>
                </div>
                <p class="text-caption text-foreground-muted">
                  En acceptant, votre rendez-vous est confirmé à ce prix.
                </p>
              }
            </div>
          }
          @if (request.status === 'COMPLETED' && request.vehicle) {
            <a
              appButton
              variant="secondary"
              class="self-start"
              [routerLink]="['/vehicles', request.vehicle.id]"
              >Voir le compte rendu dans l'historique</a
            >
          }
          @if (request.status === 'PENDING' || request.status === 'CONFIRMED') {
            <div class="border-t border-border-subtle pt-3">
              @if (confirming()) {
                <div class="flex flex-wrap items-center gap-2">
                  <input
                    [class]="inputClasses + ' flex-1'"
                    placeholder="Raison (optionnel)"
                    [value]="reason()"
                    (input)="reason.set($any($event.target).value)"
                  />
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="confirming.set(false)"
                  >
                    Non
                  </button>
                  <button
                    appButton
                    variant="danger"
                    size="sm"
                    type="button"
                    [disabled]="cancel.isPending()"
                    (click)="cancelRequest(request.id)"
                  >
                    Annuler la demande
                  </button>
                </div>
              } @else {
                <button
                  appButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  (click)="confirming.set(true)"
                >
                  Annuler la demande
                </button>
              }
              @if (error(); as message) {
                <p class="mt-2 text-body-sm text-error">{{ message }}</p>
              }
            </div>
          }
        </app-card>
        <app-card>
          <h2 class="text-h4">Messages</h2>
          <p class="mb-3 text-body-sm text-foreground-secondary">
            Échangez avec le garage : heure d’arrivée, pièces, précisions sur la panne.
          </p>
          <app-request-chat
            [requestId]="request.id"
            [closed]="request.status === 'REJECTED' || request.status === 'CANCELLED'"
          />
        </app-card>
        <app-card>
          <h2 class="mb-3 text-h4">Suivi</h2>
          <app-request-timeline [history]="data.history.data() ?? []" />
        </app-card>
        @if (request.status === 'COMPLETED') {
          <app-card class="flex flex-col gap-3">
            @if (myReview.isPending()) {
              <app-spinner />
            } @else if (myReview.data(); as review) {
              <h2 class="text-h4">Votre avis</h2>
              <app-review-card [review]="review" />
            } @else {
              <div>
                <h2 class="text-h4">Comment s’est passée l’intervention ?</h2>
                <p class="text-body-sm text-foreground-secondary">
                  Votre note aide les autres conducteurs à choisir, et le garage à progresser.
                </p>
              </div>
              <app-review-form [requestId]="request.id" />
            }
          </app-card>
        }
      </div>
    } @else {
      <app-card class="mt-6"><p class="text-body-sm">Demande introuvable.</p></app-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestDetailPage {
  readonly requestId = input.required<string>();

  protected readonly data = injectMyRequestQuery(() => Number(this.requestId()));
  protected readonly cancel = injectCancelRequestMutation();
  protected readonly quoteAnswer = injectQuoteAnswerMutations();
  protected readonly formatMoney = formatMoney;
  protected readonly myReview = injectMyReviewQuery(
    () => Number(this.requestId()),
    () => this.data.request.data()?.status === 'COMPLETED',
  );
  protected readonly locationLabels = locationLabels;
  protected readonly inputClasses = inputClasses;
  protected readonly formatNumber = formatNumber;
  protected readonly confirming = signal(false);
  protected readonly reason = signal('');
  protected readonly error = signal<string | null>(null);

  protected cancelRequest(id: number): void {
    this.error.set(null);
    this.cancel.mutate(
      { id, reason: this.reason() },
      {
        onSuccess: () => this.confirming.set(false),
        onError: (e) => this.error.set(problemMessage(e, 'Annulation impossible')),
      },
    );
  }

  protected format(value: string): string {
    return dateFormat.format(new Date(value + 'T00:00:00'));
  }

  protected answerQuote(id: number, accept: boolean): void {
    this.error.set(null);
    (accept ? this.quoteAnswer.accept : this.quoteAnswer.decline)
      .mutateAsync(id)
      .catch((error: unknown) => this.error.set(problemMessage(error, 'Action impossible')));
  }
}
