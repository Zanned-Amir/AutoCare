import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { AgentTicketFilters } from '@features/helpdesk/helpdesk.api';
import { formatDue } from '@features/helpdesk/helpdesk.format';
import {
  injectAgentTicketsQuery,
  injectHelpdeskStatsQuery,
  injectSlaPoliciesQuery,
  injectUpdateSlaPolicyMutation,
} from '@features/helpdesk/helpdesk.queries';
import {
  AgentTicket,
  HelpdeskPermissions,
  PRIORITIES,
  STATUSES,
  SlaPolicy,
  priorityLabels,
  priorityTones,
  statusLabels,
  statusTones,
} from '@features/helpdesk/helpdesk.types';
import {
  Badge,
  Card,
  Icon,
  SegmentOption,
  Segmented,
  Spinner,
  chipClass,
  chipCountClass,
  inputClasses,
  Select,
  SelectOption,
} from '@shared/ui';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

@Component({
  selector: 'app-admin-helpdesk-page',
  imports: [
    Select,
    SelectOption,
    AdminPageHeader,
    Badge,
    Card,
    Icon,
    RouterLink,
    Segmented,
    Spinner,
  ],
  template: `
    <app-admin-page-header
      title="Demandes de support"
      subtitle="Les tickets des clients et des garages, avec leurs délais de réponse."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (stats.data(); as s) {
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <app-card
            ><p class="text-caption text-foreground-muted">Non assignées</p>
            <p class="text-stat text-primary">{{ s.unassigned }}</p></app-card
          >
          <app-card
            ><p class="text-caption text-foreground-muted">Assignées à moi</p>
            <p class="text-stat text-primary">{{ s.assignedToMe }}</p></app-card
          >
          <app-card
            ><p class="text-caption text-foreground-muted">SLA dépassé</p>
            <p class="text-stat" [class]="s.activeBreached ? 'text-error' : 'text-primary'">
              {{ s.activeBreached }}
            </p></app-card
          >
          <app-card
            ><p class="text-caption text-foreground-muted">En attente client</p>
            <p class="text-stat text-primary">{{ s.byStatus.WAITING_ON_CUSTOMER }}</p></app-card
          >
        </div>
      }

      <div class="mt-6 flex flex-col gap-4">
        <div
          class="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="filters().status === null"
            [class]="chip(filters().status === null)"
            (click)="patch({ status: null })"
          >
            Tous
          </button>
          @for (s of statuses; track s) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="filters().status === s"
              [class]="chip(filters().status === s)"
              (click)="patch({ status: s })"
            >
              {{ statusLabels[s] }}
              @if (stats.data()?.byStatus?.[s]; as count) {
                <span [class]="chipCount(filters().status === s)">{{ count }}</span>
              }
            </button>
          }
        </div>
        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <div class="relative md:w-80">
            <svg
              appIcon
              name="search"
              class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground-muted"
            ></svg>
            <input
              aria-label="Recherche"
              placeholder="Sujet ou TK-…"
              class="h-10 w-full rounded-full border border-border-subtle bg-surface pr-4 pl-10 text-body-sm placeholder:text-foreground-muted focus:border-accent focus:outline-none"
              (change)="patch({ q: $any($event.target).value })"
            />
          </div>
          <app-segmented
            label="Assignation"
            [options]="assigneeOptions"
            [value]="filters().assignee"
            (valueChange)="patch({ assignee: $event })"
          />
          <app-select
            aria-label="Priorité"
            size="sm"
            class="md:ml-auto md:w-52"
            (valueChange)="patch({ priority: $event || null })"
          >
            <app-option value="">Toutes priorités</app-option>
            @for (p of priorities; track p) {
              <app-option [value]="p">{{ priorityLabels[p] }}</app-option>
            }
          </app-select>
        </div>
      </div>

      <app-card class="mt-4 p-0">
        @if (tickets.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else if (tickets.data(); as page) {
          <ul class="divide-y divide-border-subtle">
            @for (t of page.content; track t.publicId) {
              <li>
                <a
                  [routerLink]="['/admin/helpdesk', t.publicId]"
                  class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"
                >
                  <div class="min-w-0">
                    <p class="text-label text-foreground">{{ t.subject }}</p>
                    <p class="text-caption text-foreground-muted">
                      <span class="text-plate">{{ t.publicId }}</span> · {{ t.customerName }} ·
                      {{ t.assigneeName ?? 'non assignée' }}
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    @if (breached(t)) {
                      <app-badge tone="error">SLA dépassé</app-badge>
                    } @else if (!t.firstResponseAt && t.firstResponseDueAt) {
                      <span class="text-caption text-foreground-secondary"
                        >1re réponse {{ due(t.firstResponseDueAt) }}</span
                      >
                    }
                    <app-badge [tone]="priorityTones[t.priority]">{{
                      priorityLabels[t.priority]
                    }}</app-badge>
                    <app-badge [tone]="statusTones[t.status]">{{
                      statusLabels[t.status]
                    }}</app-badge>
                  </div>
                </a>
              </li>
            } @empty {
              <li class="px-4 py-6 text-body-sm text-foreground-muted">Aucune demande.</li>
            }
          </ul>
        }
      </app-card>

      <app-card class="mt-6 max-w-3xl">
        <h2 class="text-h4">Délais (SLA)</h2>
        <p class="mb-3 text-body-sm text-foreground-secondary">
          Minutes avant la première réponse et la résolution, selon la priorité.
        </p>
        <table class="w-full text-body-sm">
          <thead>
            <tr class="text-left text-foreground-muted">
              <th class="py-1">Priorité</th>
              <th>1re réponse</th>
              <th>Résolution</th>
              <th>Actif</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of sla.data() ?? []; track p.priority) {
              <tr class="border-t border-border-subtle">
                <td class="py-2">{{ priorityLabels[p.priority] }}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    [class]="inputClasses + ' h-8 w-24'"
                    [value]="p.firstResponseMinutes"
                    [disabled]="!canConfigure()"
                    (change)="edit(p, 'firstResponseMinutes', $any($event.target).value)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    [class]="inputClasses + ' h-8 w-24'"
                    [value]="p.resolutionMinutes"
                    [disabled]="!canConfigure()"
                    (change)="edit(p, 'resolutionMinutes', $any($event.target).value)"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    class="size-4 accent-primary"
                    [checked]="p.active"
                    [disabled]="!canConfigure()"
                    (change)="edit(p, 'active', $any($event.target).checked)"
                  />
                </td>
                <td class="text-caption text-success">
                  {{ savedPriority() === p.priority ? 'Enregistré' : '' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (slaError(); as message) {
          <p class="mt-2 text-body-sm text-error">{{ message }}</p>
        }
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHelpdeskPage {
  protected readonly inputClasses = inputClasses;
  protected readonly statuses = STATUSES;
  protected readonly priorities = PRIORITIES;
  protected readonly statusLabels = statusLabels;
  protected readonly statusTones = statusTones;
  protected readonly priorityLabels = priorityLabels;
  protected readonly priorityTones = priorityTones;
  protected readonly due = formatDue;
  protected readonly chip = chipClass;
  protected readonly chipCount = chipCountClass;
  protected readonly assigneeOptions: SegmentOption<string | null>[] = [
    { value: null, label: 'Tous' },
    { value: 'me', label: 'À moi' },
    { value: 'unassigned', label: 'Non assignées' },
  ];

  protected readonly filters = signal<AgentTicketFilters>({
    status: null,
    priority: null,
    assignee: null,
    q: '',
    page: 0,
  });
  protected readonly stats = injectHelpdeskStatsQuery();
  protected readonly tickets = injectAgentTicketsQuery(() => this.filters());
  protected readonly sla = injectSlaPoliciesQuery();
  private readonly updateSla = injectUpdateSlaPolicyMutation();
  private readonly auth = inject(AuthStore);
  protected readonly canConfigure = computed(() =>
    this.auth.can(HelpdeskPermissions.HELPDESK_CONFIGURE),
  );
  protected readonly savedPriority = signal<string | null>(null);
  protected readonly slaError = signal<string | null>(null);

  protected patch(change: Partial<AgentTicketFilters>): void {
    this.filters.update((f) => ({ ...f, ...change, page: 0 }));
  }

  protected breached(t: AgentTicket): boolean {
    return (
      !!(t.firstResponseBreachedAt || t.resolutionBreachedAt) &&
      t.status !== 'RESOLVED' &&
      t.status !== 'CLOSED'
    );
  }

  protected edit(policy: SlaPolicy, field: keyof SlaPolicy, value: string | boolean): void {
    const next = {
      ...policy,
      [field]: typeof value === 'boolean' ? value : Number(value),
    } as SlaPolicy;
    this.slaError.set(null);
    this.updateSla.mutate(next, {
      onSuccess: () => this.savedPriority.set(policy.priority),
      onError: (e) => this.slaError.set(problemMessage(e, 'Enregistrement impossible')),
    });
  }
}
