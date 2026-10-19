import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { injectAdminOverviewQueries } from '@features/admin-overview/admin-overview.queries';
import { priorityLabels, priorityTones } from '@features/helpdesk/helpdesk.types';
import {
  REQUEST_STATUSES,
  requestStatusLabels,
  requestStatusTones,
} from '@features/service-requests/service-requests.types';
import { injectModerateOrganizationMutation } from '@features/organizations/organizations.queries';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { Badge, Button, Card, Icon, IconName } from '@shared/ui';

interface Kpi {
  label: string;
  value: number | null;
  hint: string;
  icon: IconName;
  path: string;
  alert?: boolean;
}

/** Backoffice home (toutestcasa overview): figures, then the work waiting for the team. */
@Component({
  selector: 'app-admin-dashboard-page',
  imports: [AdminPageHeader, Badge, Button, Card, Icon, RouterLink],
  template: `
    <app-admin-page-header title="Tableau de bord" [subtitle]="greeting()">
      @if (overview.can.organizations()) {
        <a appButton actions routerLink="/admin/organizations" [queryParams]="{ new: 1 }"
          >Nouvelle entreprise</a
        >
      }
    </app-admin-page-header>

    <div class="flex flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
        @for (kpi of kpis(); track kpi.label) {
          <a [routerLink]="kpi.path" class="block">
            <app-card class="flex h-full flex-col gap-3 transition-colors hover:border-primary">
              <div class="flex items-center justify-between">
                <span class="text-body-sm text-foreground-secondary">{{ kpi.label }}</span>
                <span
                  [class]="
                    kpi.alert
                      ? 'grid size-9 place-items-center rounded-full bg-error-subtle text-error'
                      : 'grid size-9 place-items-center rounded-full bg-primary-subtle text-primary'
                  "
                  ><svg appIcon [name]="kpi.icon" class="size-[18px]"></svg
                ></span>
              </div>
              <span [class]="kpi.alert ? 'text-h2 text-error' : 'text-h2 text-primary'">{{
                kpi.value ?? '–'
              }}</span>
              <span class="text-caption text-foreground-muted">{{ kpi.hint }}</span>
            </app-card>
          </a>
        }
      </div>

      <div class="grid gap-6 xl:grid-cols-2">
        @if (overview.can.organizations()) {
          <app-card class="p-0">
            <div class="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 class="text-h4">Entreprises à valider</h2>
                <p class="text-caption text-foreground-muted">Les plus récentes d’abord</p>
              </div>
              <a routerLink="/admin/organizations" class="text-body-sm font-semibold text-primary"
                >Tout voir</a
              >
            </div>
            <ul class="divide-y divide-border-subtle">
              @for (
                organization of (overview.pendingOrganizations.data()?.content ?? []).slice(0, 5);
                track organization.id
              ) {
                <li class="flex items-center gap-3 px-5 py-3">
                  <span
                    class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-subtle text-primary"
                    ><svg appIcon name="building" class="size-4"></svg
                  ></span>
                  <a
                    [routerLink]="['/admin/organizations', organization.id]"
                    class="min-w-0 flex-1 hover:text-primary"
                  >
                    <p class="truncate text-label text-foreground">{{ organization.name }}</p>
                    <p class="truncate text-caption text-foreground-muted">
                      {{ organization.city }}, {{ organization.governorate }}
                    </p>
                  </a>
                  <button
                    appButton
                    size="sm"
                    type="button"
                    [disabled]="moderate.isPending()"
                    (click)="moderate.mutate({ id: organization.id, action: 'approve' })"
                  >
                    Valider
                  </button>
                </li>
              } @empty {
                <li class="flex items-center gap-3 px-5 py-6 text-body-sm text-foreground-muted">
                  <svg appIcon name="circle-check" class="size-5 text-success"></svg>
                  Rien en attente.
                </li>
              }
            </ul>
          </app-card>
        }

        @if (overview.can.requests()) {
          <app-card class="p-0">
            <div class="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 class="text-h4">Demandes par statut</h2>
                <p class="text-caption text-foreground-muted">
                  {{ overview.requestStats.data()?.total ?? 0 }} demandes sur la plateforme
                </p>
              </div>
              <a routerLink="/admin/requests" class="text-body-sm font-semibold text-primary"
                >Tout voir</a
              >
            </div>
            <ul class="divide-y divide-border-subtle">
              @for (status of requestStatuses; track status) {
                <li>
                  <a
                    routerLink="/admin/requests"
                    [queryParams]="{ status }"
                    class="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background-subtle"
                  >
                    <app-badge [tone]="requestStatusTones[status]">{{
                      requestStatusLabels[status]
                    }}</app-badge>
                    <span class="text-label text-foreground tabular-nums">{{
                      overview.requestStats.data()?.byStatus?.[status] ?? '–'
                    }}</span>
                  </a>
                </li>
              }
            </ul>
          </app-card>
        }

        @if (overview.can.helpdesk()) {
          <app-card class="p-0">
            <div class="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 class="text-h4">Support à prendre</h2>
                <p class="text-caption text-foreground-muted">Demandes sans agent assigné</p>
              </div>
              <a routerLink="/admin/helpdesk" class="text-body-sm font-semibold text-primary"
                >Tout voir</a
              >
            </div>
            <ul class="divide-y divide-border-subtle">
              @for (
                ticket of (overview.unassignedTickets.data()?.content ?? []).slice(0, 5);
                track ticket.publicId
              ) {
                <li>
                  <a
                    [routerLink]="['/admin/helpdesk', ticket.publicId]"
                    class="flex items-center gap-3 px-5 py-3 hover:bg-background-subtle"
                  >
                    <span
                      class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-subtle text-primary"
                      ><svg appIcon name="headset" class="size-4"></svg
                    ></span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-label text-foreground">{{
                        ticket.subject
                      }}</span>
                      <span class="block truncate text-caption text-foreground-muted"
                        ><span class="text-plate">{{ ticket.publicId }}</span> ·
                        {{ ticket.customerName }}</span
                      >
                    </span>
                    <app-badge [tone]="priorityTones[ticket.priority]">{{
                      priorityLabels[ticket.priority]
                    }}</app-badge>
                  </a>
                </li>
              } @empty {
                <li class="flex items-center gap-3 px-5 py-6 text-body-sm text-foreground-muted">
                  <svg appIcon name="circle-check" class="size-5 text-success"></svg>
                  Toutes les demandes ont un agent.
                </li>
              }
            </ul>
          </app-card>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly auth = inject(AuthStore);
  protected readonly overview = injectAdminOverviewQueries();
  protected readonly moderate = injectModerateOrganizationMutation();
  protected readonly priorityLabels = priorityLabels;
  protected readonly priorityTones = priorityTones;
  protected readonly requestStatuses = REQUEST_STATUSES;
  protected readonly requestStatusLabels = requestStatusLabels;
  protected readonly requestStatusTones = requestStatusTones;

  protected readonly greeting = computed(() => {
    const first = (this.auth.user()?.fullName ?? '').split(' ')[0];
    return first ? `Bonjour ${first}, voici ce qui attend l’équipe.` : null;
  });

  protected readonly kpis = computed<Kpi[]>(() => {
    const o = this.overview;
    const kpis: Kpi[] = [];
    if (o.can.organizations()) {
      const pending = o.pendingOrganizations.data()?.page.totalElements ?? null;
      kpis.push(
        {
          label: 'À valider',
          value: pending,
          hint: 'Entreprises en attente de validation',
          icon: 'building',
          path: '/admin/organizations',
          alert: !!pending,
        },
        {
          label: 'Garages actifs',
          value: o.approvedOrganizations.data()?.page.totalElements ?? null,
          hint: 'Visibles dans la recherche',
          icon: 'map-pin',
          path: '/admin/organizations',
        },
      );
    }
    if (o.can.requests()) {
      const stats = o.requestStats.data();
      kpis.push({
        label: 'Demandes du jour',
        value: stats ? stats.createdToday : null,
        hint: stats
          ? `${stats.byStatus.PENDING} en attente d’un prestataire`
          : 'Envoyées aujourd’hui',
        icon: 'requests',
        path: '/admin/requests',
      });
    }
    if (o.can.helpdesk()) {
      const stats = o.helpdeskStats.data();
      kpis.push({
        label: 'Support',
        value: stats ? stats.unassigned : null,
        hint: stats?.activeBreached
          ? `${stats.activeBreached} hors délai (SLA)`
          : 'Demandes à assigner',
        icon: 'headset',
        path: '/admin/helpdesk',
        alert: !!stats?.activeBreached,
      });
    }
    if (o.can.users())
      kpis.push({
        label: 'Utilisateurs',
        value: o.users.data()?.page.totalElements ?? null,
        hint: 'Comptes clients, pros et équipe',
        icon: 'users',
        path: '/admin/users',
      });
    if (o.can.catalog())
      kpis.push({
        label: 'Services',
        value: o.services.data()?.page.totalElements ?? null,
        hint: 'Au catalogue',
        icon: 'wrench',
        path: '/admin/catalog',
      });
    return kpis.slice(0, 6);
  });
}
