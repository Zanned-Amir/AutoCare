import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { TicketThread } from '@features/helpdesk/components/ticket-thread';
import {
  injectCustomerTicketMutations,
  injectTicketMessagesQuery,
  injectTicketQuery,
} from '@features/helpdesk/helpdesk.queries';
import { categoryLabels, statusLabels, statusTones } from '@features/helpdesk/helpdesk.types';
import { Badge, Button, Card, Spinner, inputClasses } from '@shared/ui';

@Component({
  selector: 'app-support-ticket-page',
  imports: [Badge, Button, Card, RouterLink, Spinner, TicketThread],
  template: `
    <a routerLink="/support" class="text-body-sm text-primary hover:underline">← Mes demandes</a>
    @if (ticket.isPending()) {
      <div class="mt-6"><app-spinner /></div>
    } @else if (ticket.data(); as current) {
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <h1 class="text-h3 text-primary">{{ current.subject }}</h1>
        <app-badge [tone]="tones[current.status]">{{ labels[current.status] }}</app-badge>
      </div>
      <p class="text-body-sm text-foreground-secondary">
        <span class="text-plate">{{ current.publicId }}</span> · {{ categories[current.category] }}
      </p>

      <div class="mt-6 max-w-3xl">
        <app-ticket-thread
          [description]="current.description"
          [openedAt]="current.createdAt"
          [messages]="messages.data() ?? []"
        />

        @if (current.status === 'CLOSED') {
          <p class="mt-4 text-body-sm text-foreground-muted">
            Cette demande est fermée.
            <a routerLink="/support" class="text-primary underline">Ouvrir une nouvelle demande</a>
          </p>
        } @else {
          <app-card class="mt-4">
            <label class="flex flex-col gap-1.5">
              <span class="text-label">Votre réponse</span>
              <textarea
                [class]="inputClasses + ' h-28 py-2'"
                [value]="body()"
                (input)="body.set($any($event.target).value)"
              ></textarea>
            </label>
            @if (error(); as message) {
              <p class="mt-2 text-body-sm text-error">{{ message }}</p>
            }
            <div class="mt-3 flex flex-wrap justify-between gap-2">
              <div class="flex gap-2">
                @if (current.status === 'RESOLVED') {
                  <button appButton variant="secondary" size="sm" type="button" (click)="reopen()">
                    Le problème persiste
                  </button>
                }
                <button appButton variant="ghost" size="sm" type="button" (click)="close()">
                  Fermer la demande
                </button>
              </div>
              <button
                appButton
                size="sm"
                type="button"
                [disabled]="!body().trim() || mutations.reply.isPending()"
                (click)="send()"
              >
                Envoyer
              </button>
            </div>
          </app-card>
        }
      </div>
    } @else {
      <app-card class="mt-6"><p class="text-body-sm">Demande introuvable.</p></app-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportTicketPage {
  readonly publicId = input.required<string>();

  protected readonly ticket = injectTicketQuery(() => this.publicId());
  protected readonly messages = injectTicketMessagesQuery(() => this.publicId());
  protected readonly mutations = injectCustomerTicketMutations();
  protected readonly labels = statusLabels;
  protected readonly tones = statusTones;
  protected readonly categories = categoryLabels;
  protected readonly inputClasses = inputClasses;
  protected readonly body = signal('');
  protected readonly error = signal<string | null>(null);

  protected send(): void {
    this.error.set(null);
    this.mutations.reply.mutate(
      { id: this.publicId(), body: this.body() },
      {
        onSuccess: () => this.body.set(''),
        onError: (e) => this.error.set(problemMessage(e, 'Envoi impossible')),
      },
    );
  }

  protected close(): void {
    this.mutations.close.mutate(this.publicId(), {
      onError: (e) => this.error.set(problemMessage(e, 'Action impossible')),
    });
  }

  protected reopen(): void {
    this.mutations.reopen.mutate(this.publicId(), {
      onError: (e) => this.error.set(problemMessage(e, 'Action impossible')),
    });
  }
}
