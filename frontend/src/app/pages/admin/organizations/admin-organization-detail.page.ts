import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { AuditTrail } from '@features/audit/components/audit-trail';
import { MembersPanel } from '@features/organizations/components/members-panel';
import { OrganizationFilesPanel } from '@features/organizations/components/organization-files-panel';
import { OrganizationForm } from '@features/organizations/components/organization-form';
import { OrganizationStatusBadge } from '@features/organizations/components/organization-status-badge';
import {
  injectAdminOrganizationQuery,
  injectModerateOrganizationMutation,
  injectOrganizationFilesQueries,
} from '@features/organizations/organizations.queries';
import { organizationTypeLabels } from '@features/organizations/organizations.types';
import { injectAdminOrganizationServicesQuery } from '@features/providers/providers.queries';
import { RequestStatusBadge } from '@features/service-requests/components/request-status-badge';
import { injectAdminRequestsQuery } from '@features/service-requests/service-requests.queries';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { formatMoney } from '@shared/utils/money';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { Badge, Button, Card, ConfirmDialog, Icon, Spinner } from '@shared/ui';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

/** One organization for the admin: edit its profile, see its team and documents, moderate it. */
@Component({
  selector: 'app-admin-organization-detail-page',
  imports: [
    AdminPageHeader,
    AuditTrail,
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Icon,
    MembersPanel,
    OrganizationFilesPanel,
    OrganizationForm,
    OrganizationStatusBadge,
    RequestStatusBadge,
    RouterLink,
    Spinner,
  ],
  template: `
    <app-admin-page-header
      [title]="organization.data()?.name ?? 'Entreprise'"
      [subtitle]="subtitle()"
      [breadcrumbs]="[
        { label: 'Entreprises', path: '/admin/organizations' },
        { label: organization.data()?.name ?? '…' },
      ]"
    >
      @if (organization.data(); as current) {
        <app-organization-status-badge badge [status]="current.status" />
      }
      @if (organization.data(); as current) {
        <div actions class="flex gap-2">
          @if (current.status !== 'APPROVED') {
            <button
              appButton
              type="button"
              [disabled]="moderate.isPending()"
              (click)="requestApproval()"
            >
              Valider
            </button>
          }
          @if (current.status !== 'SUSPENDED') {
            <button
              appButton
              variant="secondary"
              type="button"
              (click)="actionError.set(null); confirmSuspend.set(true)"
            >
              Suspendre
            </button>
          }
          @if (current.status === 'APPROVED') {
            <a appButton variant="ghost" [routerLink]="['/providers', current.id]" target="_blank"
              ><svg appIcon name="external" class="mr-1.5 size-4"></svg>Fiche publique</a
            >
          }
        </div>
      }
    </app-admin-page-header>

    <app-confirm-dialog
      [open]="confirmSuspend()"
      tone="danger"
      icon="building"
      title="Suspendre cette entreprise ?"
      description="Elle disparaît de la recherche et ne reçoit plus de demandes. Vous pourrez la valider à nouveau."
      confirmLabel="Suspendre"
      [busy]="moderate.isPending()"
      [error]="actionError()"
      (confirmed)="run('suspend')"
      (cancelled)="confirmSuspend.set(false)"
    />

    <app-confirm-dialog
      [open]="confirmApprove()"
      icon="info"
      title="Valider malgré tout ?"
      [description]="
        'Il manque : ' +
        missing().join(', ') +
        '. La fiche sera visible dans la recherche telle quelle.'
      "
      confirmLabel="Valider quand même"
      [busy]="moderate.isPending()"
      [error]="actionError()"
      (confirmed)="run('approve')"
      (cancelled)="confirmApprove.set(false)"
    />

    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (organization.data()?.status === 'PENDING') {
        <app-card class="mb-6 flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-h4 text-foreground">Avant de valider</h2>
              <p class="text-body-sm text-foreground-secondary">
                {{ doneCount() }} / {{ checklist().length }} points prêts. Les documents sont
                indispensables ; le reste rend la fiche plus attirante.
              </p>
            </div>
            <div
              class="h-2 w-40 overflow-hidden rounded-full bg-background-subtle"
              role="progressbar"
              aria-label="Préparation de la fiche"
              aria-valuemin="0"
              [attr.aria-valuemax]="checklist().length"
              [attr.aria-valuenow]="doneCount()"
            >
              <div
                class="h-full rounded-full bg-accent transition-[width]"
                [style.width.%]="(doneCount() / checklist().length) * 100"
              ></div>
            </div>
          </div>
          <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            @for (item of checklist(); track item.label) {
              <li class="flex items-center gap-2.5 text-body-sm">
                <span
                  [class]="
                    item.done
                      ? 'grid size-6 shrink-0 place-items-center rounded-full bg-success-subtle text-success'
                      : item.required
                        ? 'grid size-6 shrink-0 place-items-center rounded-full bg-error-subtle text-error'
                        : 'grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-foreground-muted'
                  "
                  ><svg appIcon [name]="item.done ? 'check' : 'x'" class="size-3.5"></svg
                ></span>
                <span [class]="item.done ? 'text-foreground' : 'text-foreground-secondary'">
                  {{ item.label }}
                  @if (item.required && !item.done) {
                    <span class="text-caption text-error">· requis</span>
                  }
                </span>
              </li>
            }
          </ul>
        </app-card>
      }
      @if (actionError(); as message) {
        <p
          class="mb-4 rounded-2xl border border-error bg-error-subtle px-4 py-3 text-body-sm text-error"
        >
          {{ message }}
        </p>
      }
      @if (organization.isPending()) {
        <app-spinner />
      } @else if (organization.data(); as current) {
        <div class="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <app-card>
            @if (files.photos.data()?.[0] || files.logo.data()) {
              <!-- What clients see first: the cover photo and the logo. -->
              <div
                class="relative -mx-6 -mt-6 mb-5 h-40 overflow-hidden rounded-t-[inherit] bg-background-subtle sm:h-52"
              >
                @if (files.photos.data()?.[0]; as cover) {
                  <img [src]="cover.url" alt="Photo de couverture" class="size-full object-cover" />
                }
                @if (files.logo.data(); as logo) {
                  <img
                    [src]="logo.url"
                    alt="Logo"
                    class="absolute bottom-3 left-4 size-16 rounded-2xl border-2 border-surface bg-surface object-cover shadow-card"
                  />
                }
              </div>
            }
            <h2 class="mb-1 text-h4">Profil</h2>
            <p class="mb-5 text-body-sm text-foreground-secondary">
              {{ typeLabels[current.type] }} · créée le {{ format(current.createdAt) }}
            </p>
            <app-organization-form mode="admin" [organization]="current" [showCancel]="false" />
          </app-card>

          <div class="flex flex-col gap-6">
            <app-members-panel admin [organization]="current" />

            @if (current.type === 'PROVIDER') {
              <app-card class="p-0">
                <div class="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 class="text-h4">Services proposés</h2>
                  <span class="text-caption text-foreground-muted"
                    >{{ services.data()?.length ?? 0 }} service(s)</span
                  >
                </div>
                <ul class="divide-y divide-border-subtle">
                  @for (service of services.data() ?? []; track service.id) {
                    <li class="flex items-center justify-between gap-3 px-5 py-3">
                      <span class="min-w-0 truncate text-label text-foreground">{{
                        service.serviceName || 'Service retiré du catalogue'
                      }}</span>
                      <span class="flex shrink-0 items-center gap-2">
                        @if (service.atHome) {
                          <app-badge tone="info">À domicile</app-badge>
                        }
                        <span class="text-body-sm text-foreground-secondary">{{
                          service.indicativePrice
                            ? formatMoney(service.indicativePrice)
                            : 'Sur devis'
                        }}</span>
                      </span>
                    </li>
                  } @empty {
                    <li class="px-5 pb-5 text-body-sm text-foreground-muted">
                      Aucun service proposé pour l’instant.
                    </li>
                  }
                </ul>
              </app-card>
            }

            @if (canReadRequests()) {
              <app-card class="p-0">
                <div class="flex items-center justify-between px-5 pt-5 pb-3">
                  <div>
                    <h2 class="text-h4">Demandes récentes</h2>
                    <p class="text-caption text-foreground-muted">
                      {{ requests.data()?.page?.totalElements ?? 0 }} au total
                    </p>
                  </div>
                  <a
                    routerLink="/admin/requests"
                    [queryParams]="{ organizationId: current.id }"
                    class="text-body-sm font-semibold text-primary"
                    >Tout voir</a
                  >
                </div>
                <ul class="divide-y divide-border-subtle">
                  @for (request of requests.data()?.content ?? []; track request.id) {
                    <li class="flex items-center gap-3 px-5 py-3">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-label text-foreground">
                          {{ request.service.name ?? 'Service' }}
                        </p>
                        <p class="truncate text-caption text-foreground-muted">
                          {{ request.customer?.fullName }} · {{ format(request.createdAt) }}
                        </p>
                      </div>
                      <app-request-status-badge [status]="request.status" />
                    </li>
                  } @empty {
                    <li class="px-5 pb-5 text-body-sm text-foreground-muted">
                      Aucune demande reçue.
                    </li>
                  }
                </ul>
              </app-card>
            }

            <app-organization-files-panel admin [organizationId]="current.id" />

            <app-audit-trail targetType="ORGANIZATION" [targetId]="current.id" />
          </div>
        </div>
      } @else {
        <app-card class="max-w-md">
          <h2 class="text-h4">Entreprise introuvable</h2>
          <a appButton variant="secondary" class="mt-4" routerLink="/admin/organizations"
            >Retour à la liste</a
          >
        </app-card>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrganizationDetailPage {
  /** Route param, bound by withComponentInputBinding(). */
  readonly organizationId = input.required<string>();

  private readonly id = computed(() => Number(this.organizationId()));
  protected readonly organization = injectAdminOrganizationQuery(() => this.id());
  private readonly auth = inject(AuthStore);
  protected readonly services = injectAdminOrganizationServicesQuery(() => this.id());
  protected readonly canReadRequests = computed(() =>
    this.auth.can(ServiceRequestPermissions.REQUEST_READ),
  );
  protected readonly requests = injectAdminRequestsQuery(
    () => ({
      status: null,
      organizationId: this.id(),
      userId: null,
      from: null,
      to: null,
      page: 0,
      size: 5,
    }),
    () => this.canReadRequests(),
  );
  protected readonly formatMoney = formatMoney;
  protected readonly moderate = injectModerateOrganizationMutation();
  protected readonly confirmSuspend = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly typeLabels = organizationTypeLabels;

  protected readonly subtitle = computed(() => {
    const current = this.organization.data();
    return current ? `${current.city}, ${current.governorate} · ${current.phone}` : null;
  });

  protected readonly confirmApprove = signal(false);
  protected readonly files = injectOrganizationFilesQueries(
    () => this.id(),
    () => true,
  );

  /** What a reviewer checks before an organization shows up in search. */
  protected readonly checklist = computed(() => {
    const organization = this.organization.data();
    return [
      {
        label: 'Documents de validation',
        done: !!this.files.documents.data()?.length,
        required: true,
      },
      // Sellers do not offer services (V2 marketplace).
      ...(organization?.type === 'PROVIDER'
        ? [
            {
              label: 'Au moins un service proposé',
              done: !!this.services.data()?.length,
              required: true,
            },
          ]
        : []),
      { label: 'Logo', done: !!this.files.logo.data(), required: false },
      { label: 'Photos de l’atelier', done: !!this.files.photos.data()?.length, required: false },
      {
        label: 'Placée sur la carte',
        done: organization?.latitude != null && organization?.longitude != null,
        required: false,
      },
      { label: 'Présentation', done: !!organization?.description?.trim(), required: false },
    ];
  });
  protected readonly doneCount = computed(
    () => this.checklist().filter((item) => item.done).length,
  );
  protected readonly missing = computed(() =>
    this.checklist()
      .filter((item) => item.required && !item.done)
      .map((item) => item.label.toLowerCase()),
  );

  /** Approves at once when the required points are there, otherwise asks first. */
  protected requestApproval(): void {
    this.actionError.set(null);
    if (this.missing().length) this.confirmApprove.set(true);
    else this.run('approve');
  }

  protected run(action: 'approve' | 'suspend'): void {
    this.actionError.set(null);
    this.moderate.mutate(
      { id: this.id(), action },
      {
        onSuccess: () => {
          this.confirmSuspend.set(false);
          this.confirmApprove.set(false);
        },
        onError: (error) => this.actionError.set(problemMessage(error, 'Action impossible')),
      },
    );
  }

  protected format(value: string): string {
    return dateFormat.format(new Date(value));
  }
}
