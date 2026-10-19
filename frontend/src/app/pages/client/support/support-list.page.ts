import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { NewTicketForm } from '@features/helpdesk/components/new-ticket-form';
import { formatDateTime } from '@features/helpdesk/helpdesk.format';
import { injectMyTicketsQuery } from '@features/helpdesk/helpdesk.queries';
import { Ticket, statusLabels, statusTones } from '@features/helpdesk/helpdesk.types';
import { Badge, Button, Card, EmptyState, Spinner } from '@shared/ui';

@Component({
  selector: 'app-support-list-page',
  imports: [Badge, Button, Card, EmptyState, NewTicketForm, RouterLink, Spinner],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span class="text-overline text-accent-text">Aide</span>
        <h1 class="text-h2 text-primary">Support</h1>
      </div>
      @if (!creating()) {
        <button appButton type="button" (click)="creating.set(true)">Nouvelle demande</button>
      }
    </div>

    @if (creating()) {
      <app-card class="mt-6">
        <h2 class="mb-4 text-h4">Décrivez votre problème</h2>
        <app-new-ticket-form (created)="open($event)" (cancelled)="creating.set(false)" />
      </app-card>
    }

    <app-card class="mt-6 p-0">
      @if (tickets.isPending()) {
        <div class="p-6"><app-spinner /></div>
      } @else if (tickets.data(); as page) {
        <ul class="divide-y divide-border-subtle">
          @for (ticket of page.content; track ticket.publicId) {
            <li>
              <a
                [routerLink]="['/support', ticket.publicId]"
                class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <div class="min-w-0">
                  <p class="text-label text-foreground">{{ ticket.subject }}</p>
                  <p class="text-caption text-foreground-muted">
                    <span class="text-plate">{{ ticket.publicId }}</span> · mis à jour le
                    {{ format(ticket.updatedAt) }}
                  </p>
                </div>
                <app-badge [tone]="tones[ticket.status]">{{ labels[ticket.status] }}</app-badge>
              </a>
            </li>
          } @empty {
            <li>
              <app-empty-state
                image="support"
                title="Aucune demande de support"
                description="Une question ou un souci avec un prestataire ? Notre équipe vous répond."
              />
            </li>
          }
        </ul>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportListPage {
  protected readonly creating = signal(false);
  protected readonly tickets = injectMyTicketsQuery(() => 0);
  protected readonly labels = statusLabels;
  protected readonly tones = statusTones;
  protected readonly format = formatDateTime;
  private readonly router = inject(Router);

  protected open(ticket: Ticket): void {
    void this.router.navigate(['/support', ticket.publicId]);
  }
}
