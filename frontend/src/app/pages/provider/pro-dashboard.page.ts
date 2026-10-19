import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { injectOrganizationFilesQueries } from '@features/organizations/organizations.queries';
import { injectProviderServicesQuery } from '@features/providers/providers.queries';
import { RequestInsights } from '@features/service-requests/components/request-insights';
import { RequestStatusBadge } from '@features/service-requests/components/request-status-badge';
import { injectOrganizationRequestsQuery } from '@features/service-requests/service-requests.queries';
import { RequestStatus } from '@features/service-requests/service-requests.types';
import { ProContext } from '@layouts/pro/pro-context';
import { Button, Card, EmptyState, Icon, IconName } from '@shared/ui';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

const dateFormat = new Intl.DateTimeFormat('fr-TN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

@Component({
  selector: 'app-pro-dashboard-page',
  imports: [
    AdminPageHeader,
    Button,
    Card,
    EmptyState,
    Icon,
    RequestInsights,
    RequestStatusBadge,
    RouterLink,
  ],
  template: `
    <app-admin-page-header title="Tableau de bord" [subtitle]="context.organization()?.name ?? null"
      ><a appButton actions variant="accent" [routerLink]="base() + '/requests'"
        >Voir les demandes</a
      ></app-admin-page-header
    >
    <div class="px-4 py-5 md:px-8 md:py-8">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        @for (kpi of kpis; track kpi.status) {
          <a [routerLink]="base() + '/requests'" class="block">
            <app-card class="flex h-full items-center gap-3 transition hover:border-primary">
              <span [class]="'grid size-11 place-items-center rounded-control ' + kpi.tone"
                ><svg appIcon [name]="kpi.icon" class="size-5"></svg
              ></span>
              <div>
                <p class="text-stat text-foreground">
                  {{ requests.counts.data()?.[kpi.status] ?? 0 }}
                </p>
                <p class="text-caption text-foreground-muted">{{ kpi.label }}</p>
              </div>
            </app-card>
          </a>
        }
      </div>

      <app-request-insights class="mt-6 block" [organizationId]="id()" />

      <div class="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <app-card class="p-0">
          <div class="flex items-center justify-between border-b border-border-subtle p-4">
            <h2 class="text-h4">À traiter</h2>
            <a [routerLink]="base() + '/requests'" class="text-body-sm text-primary hover:underline"
              >Tout voir</a
            >
          </div>
          <ul class="divide-y divide-border-subtle">
            @for (request of (requests.list.data()?.content ?? []).slice(0, 5); track request.id) {
              <li class="flex items-center justify-between gap-3 px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate text-label text-foreground">
                    {{ request.service.name }} · {{ request.customer?.fullName }}
                  </p>
                  <p class="text-caption text-foreground-muted">
                    {{ format(request.desiredDate) }}
                    @if (request.vehicle; as vehicle) {
                      · {{ vehicle.brand }} {{ vehicle.model }}
                    }
                  </p>
                </div>
                <app-request-status-badge [status]="request.status" />
              </li>
            } @empty {
              <li>
                <app-empty-state
                  image="empty-requests"
                  size="sm"
                  title="Tout est à jour"
                  description="Les nouvelles demandes de vos clients apparaîtront ici."
                />
              </li>
            }
          </ul>
        </app-card>

        <app-card>
          <h2 class="text-h4">Votre profil</h2>
          <p class="text-caption text-foreground-muted">
            Un profil complet attire plus de clients.
          </p>
          <ul class="mt-4 flex flex-col gap-3">
            @for (step of checklist(); track step.label) {
              <li>
                <a
                  [routerLink]="step.path"
                  class="flex items-center gap-3 text-body-sm hover:text-primary"
                >
                  <span
                    [class]="
                      step.done
                        ? 'grid size-6 place-items-center rounded-full bg-success text-white'
                        : 'grid size-6 place-items-center rounded-full border-2 border-border text-foreground-muted'
                    "
                  >
                    @if (step.done) {
                      <svg appIcon name="shield" class="size-3.5"></svg>
                    }
                  </span>
                  <span
                    [class]="step.done ? 'text-foreground-muted line-through' : 'text-foreground'"
                    >{{ step.label }}</span
                  >
                </a>
              </li>
            }
          </ul>
        </app-card>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProDashboardPage {
  protected readonly context = inject(ProContext);
  protected readonly id = computed(() => this.context.organizationId());
  protected readonly base = computed(() => '/pro/' + this.id());
  protected readonly requests = injectOrganizationRequestsQuery(
    () => this.id(),
    () => 'PENDING',
    () => 0,
  );
  private readonly services = injectProviderServicesQuery(
    () => this.id(),
    () => this.id() > 0,
  );
  private readonly files = injectOrganizationFilesQueries(() => this.id());

  protected readonly kpis: {
    status: RequestStatus;
    label: string;
    icon: IconName;
    tone: string;
  }[] = [
    {
      status: 'PENDING',
      label: 'En attente',
      icon: 'bell',
      tone: 'bg-warning-subtle text-warning',
    },
    { status: 'CONFIRMED', label: 'Acceptées', icon: 'clock', tone: 'bg-info-subtle text-info' },
    {
      status: 'IN_PROGRESS',
      label: 'En cours',
      icon: 'wrench',
      tone: 'bg-primary-subtle text-primary',
    },
    {
      status: 'COMPLETED',
      label: 'Terminées',
      icon: 'shield',
      tone: 'bg-success-subtle text-success',
    },
  ];

  protected readonly checklist = computed(() => [
    {
      label: 'Ajouter vos services et tarifs',
      done: (this.services.data()?.length ?? 0) > 0,
      path: this.base() + '/services',
    },
    {
      label: 'Placer votre établissement sur la carte',
      done: this.context.organization()?.latitude != null,
      path: this.base() + '/profile',
    },
    { label: 'Ajouter votre logo', done: !!this.files.logo.data(), path: this.base() + '/profile' },
    {
      label: 'Envoyer vos documents de validation',
      done: (this.files.documents.data()?.length ?? 0) > 0,
      path: this.base() + '/profile',
    },
  ]);

  protected format(value: string): string {
    return dateFormat.format(new Date(value + 'T00:00:00'));
  }
}
