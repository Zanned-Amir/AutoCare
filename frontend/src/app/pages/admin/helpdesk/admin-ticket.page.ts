import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { TicketThread } from '@features/helpdesk/components/ticket-thread';
import { formatDateTime, formatDue } from '@features/helpdesk/helpdesk.format';
import {
  injectAgentMessagesQuery,
  injectAgentTicketMutations,
  injectAgentTicketQuery,
  injectTicketEventsQuery,
} from '@features/helpdesk/helpdesk.queries';
import {
  PRIORITIES,
  STATUSES,
  TicketStatus,
  categoryLabels,
  eventLabels,
  priorityLabels,
  priorityTones,
  statusLabels,
  statusTones,
} from '@features/helpdesk/helpdesk.types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Spinner,
  inputClasses,
  Select,
  SelectOption,
} from '@shared/ui';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

@Component({
  selector: 'app-admin-ticket-page',
  imports: [
    Select,
    SelectOption,
    AdminPageHeader,
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Spinner,
    TicketThread,
  ],
  template: `
    <app-admin-page-header
      [title]="ticket.data()?.subject ?? 'Demande de support'"
      [breadcrumbs]="[
        { label: 'Support', path: '/admin/helpdesk' },
        { label: ticket.data()?.publicId ?? '…' },
      ]"
    >
      @if (ticket.data(); as t) {
        <div badge class="flex flex-wrap items-center gap-2">
          <app-badge [tone]="statusTones[t.status]">{{ statusLabels[t.status] }}</app-badge
          ><app-badge [tone]="priorityTones[t.priority]">{{
            priorityLabels[t.priority]
          }}</app-badge>
          @if (t.escalationLevel > 0) {
            <app-badge tone="error">Escaladée ×{{ t.escalationLevel }}</app-badge>
          }
        </div>
      }
    </app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (ticket.isPending()) {
        <div class="mt-6"><app-spinner /></div>
      } @else if (ticket.data(); as t) {
        <p class="text-body-sm text-foreground-secondary">
          <span class="text-plate">{{ t.publicId }}</span> · {{ categories[t.category] }} ·
          {{ t.customerName }} ({{ t.customerEmail }})
          @if (t.referenceType) {
            · {{ t.referenceType }} #{{ t.referenceId }}
          }
        </p>

        <div class="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <app-ticket-thread
              [description]="t.description"
              [openedAt]="t.createdAt"
              [openedBy]="t.customerName ?? 'Client'"
              [messages]="messages.data() ?? []"
              [agentView]="true"
            />
            @if (t.status !== 'CLOSED') {
              <app-card class="mt-4">
                <label class="flex flex-col gap-1.5">
                  <span class="text-label">{{
                    internal() ? 'Note interne (invisible pour le client)' : 'Réponse au client'
                  }}</span>
                  <textarea
                    [class]="inputClasses + ' h-28 py-2'"
                    [value]="body()"
                    (input)="body.set($any($event.target).value)"
                  ></textarea>
                </label>
                <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label class="flex items-center gap-2 text-body-sm">
                    <input
                      type="checkbox"
                      class="size-4 accent-primary"
                      [checked]="internal()"
                      (change)="internal.set($any($event.target).checked)"
                    />
                    Note interne
                  </label>
                  <div class="flex items-center gap-2">
                    @if (!internal()) {
                      <app-select
                        aria-label="Statut après réponse"
                        class="h-8 w-56 text-body-sm"
                        (valueChange)="afterStatus.set($event)"
                      >
                        <app-option value="WAITING_ON_CUSTOMER">Attendre le client</app-option>
                        <app-option value="IN_PROGRESS">Laisser en cours</app-option>
                        <app-option value="RESOLVED">Marquer résolue</app-option>
                      </app-select>
                    }
                    <button
                      appButton
                      size="sm"
                      type="button"
                      [disabled]="!body().trim() || actions.reply.isPending()"
                      (click)="send()"
                    >
                      Envoyer
                    </button>
                  </div>
                </div>
              </app-card>
            }
            @if (error(); as message) {
              <p class="mt-2 text-body-sm text-error">{{ message }}</p>
            }
          </div>

          <div class="flex flex-col gap-4">
            <app-card class="flex flex-col gap-3">
              <h2 class="text-h4">Traitement</h2>
              <p class="text-body-sm">
                Assignée à : <strong>{{ t.assigneeName ?? 'personne' }}</strong>
              </p>
              <div class="flex flex-wrap gap-2">
                @if (t.assigneeId !== auth.user()?.id) {
                  <button
                    appButton
                    size="sm"
                    type="button"
                    (click)="run(actions.pick.mutateAsync())"
                  >
                    Prendre
                  </button>
                } @else {
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="run(actions.release.mutateAsync())"
                  >
                    Libérer
                  </button>
                }
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [disabled]="t.status === 'CLOSED'"
                  (click)="error.set(null); escalateReason.set(''); escalating.set(true)"
                >
                  Escalader
                </button>
              </div>
              <label class="flex flex-col gap-1 text-body-sm"
                >Statut
                <app-select
                  class="h-9"
                  [disabled]="t.status === 'CLOSED'"
                  (valueChange)="run(actions.status.mutateAsync($event))"
                >
                  @for (s of statuses; track s) {
                    <app-option [value]="s" [selected]="s === t.status">{{
                      statusLabels[s]
                    }}</app-option>
                  }
                </app-select>
              </label>
              <label class="flex flex-col gap-1 text-body-sm"
                >Priorité
                <app-select
                  class="h-9"
                  [disabled]="t.status === 'CLOSED'"
                  (valueChange)="run(actions.update.mutateAsync({ priority: $event }))"
                >
                  @for (p of priorities; track p) {
                    <app-option [value]="p" [selected]="p === t.priority">
                      {{ priorityLabels[p] }}
                    </app-option>
                  }
                </app-select>
              </label>
            </app-card>

            <app-card class="flex flex-col gap-1 text-body-sm">
              <h2 class="mb-1 text-h4">SLA</h2>
              <p>
                1re réponse :
                {{
                  t.firstResponseAt ? 'le ' + format(t.firstResponseAt) : due(t.firstResponseDueAt)
                }}
                @if (t.firstResponseBreachedAt) {
                  <app-badge tone="error">dépassé</app-badge>
                }
              </p>
              <p>
                Résolution :
                {{ t.slaPaused ? 'en pause (attente client)' : due(t.resolutionDueAt) }}
                @if (t.resolutionBreachedAt) {
                  <app-badge tone="error">dépassé</app-badge>
                }
              </p>
            </app-card>

            <app-card>
              <h2 class="mb-2 text-h4">Historique</h2>
              <ol class="flex flex-col gap-1 text-caption text-foreground-secondary">
                @for (e of events.data() ?? []; track $index) {
                  <li>{{ format(e.createdAt) }} · {{ eventLabels[e.type] ?? e.type }}</li>
                }
              </ol>
            </app-card>
          </div>
        </div>
      } @else {
        <app-card class="mt-6"><p class="text-body-sm">Demande introuvable.</p></app-card>
      }
    </div>

    <app-confirm-dialog
      [open]="escalating()"
      icon="info"
      title="Escalader cette demande ?"
      description="La priorité monte d’un cran et les délais SLA sont recalculés."
      confirmLabel="Escalader"
      [busy]="actions.escalate.isPending()"
      [confirmDisabled]="!escalateReason().trim()"
      [error]="error()"
      (confirmed)="escalate()"
      (cancelled)="escalating.set(false)"
    >
      <label class="mt-4 flex flex-col gap-1.5 text-left">
        <span class="text-label text-foreground">Raison</span>
        <input
          [class]="inputClasses"
          [value]="escalateReason()"
          (input)="escalateReason.set($any($event.target).value)"
          placeholder="Client bloqué, garage injoignable…"
        />
      </label>
    </app-confirm-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTicketPage {
  readonly publicId = input.required<string>();

  protected readonly auth = inject(AuthStore);
  protected readonly ticket = injectAgentTicketQuery(() => this.publicId());
  protected readonly messages = injectAgentMessagesQuery(() => this.publicId());
  protected readonly events = injectTicketEventsQuery(() => this.publicId());
  protected readonly actions = injectAgentTicketMutations(() => this.publicId());
  protected readonly inputClasses = inputClasses;
  protected readonly statuses = STATUSES;
  protected readonly priorities = PRIORITIES;
  protected readonly statusLabels = statusLabels;
  protected readonly statusTones = statusTones;
  protected readonly priorityLabels = priorityLabels;
  protected readonly priorityTones = priorityTones;
  protected readonly categories = categoryLabels;
  protected readonly eventLabels = eventLabels;
  protected readonly format = formatDateTime;
  protected readonly due = formatDue;
  protected readonly body = signal('');
  protected readonly internal = signal(false);
  protected readonly afterStatus = signal<TicketStatus>('WAITING_ON_CUSTOMER');
  protected readonly error = signal<string | null>(null);

  protected send(): void {
    this.run(
      this.actions.reply
        .mutateAsync({
          body: this.body(),
          internal: this.internal(),
          status: this.internal() ? null : this.afterStatus(),
        })
        .then(() => this.body.set('')),
    );
  }

  protected readonly escalating = signal(false);
  protected readonly escalateReason = signal('');

  protected escalate(): void {
    this.run(
      this.actions.escalate
        .mutateAsync(this.escalateReason().trim())
        .then(() => this.escalating.set(false)),
    );
  }

  protected run(action: Promise<unknown>): void {
    this.error.set(null);
    action.catch((e: unknown) => this.error.set(problemMessage(e, 'Action impossible')));
  }
}
