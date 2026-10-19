import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import { RequestStatusBadge } from '@features/service-requests/components/request-status-badge';
import { RequestTimeline } from '@features/service-requests/components/request-timeline';
import {
  injectAdminRequestHistoryQuery,
  injectAdminRequestStatsQuery,
  injectAdminRequestsCsvExport,
  injectAdminRequestsQuery,
} from '@features/service-requests/service-requests.queries';
import {
  REQUEST_STATUSES,
  RequestStatus,
  ServiceRequest,
  locationLabels,
  requestStatusLabels,
} from '@features/service-requests/service-requests.types';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import {
  ExportButton,
  Button,
  Card,
  Drawer,
  EmptyState,
  Icon,
  MultiSelectChip,
  MultiSelectOption,
  Spinner,
  chipClass,
  chipCountClass,
  inputClasses,
} from '@shared/ui';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

/**
 * Every service request on the platform (read only). ?status, ?organizationId and ?userId come
 * from the dashboard, organization and user pages.
 */
@Component({
  selector: 'app-admin-requests-page',
  imports: [
    AdminPageHeader,
    ExportButton,
    Button,
    Card,
    Drawer,
    EmptyState,
    Icon,
    MultiSelectChip,
    RequestStatusBadge,
    RequestTimeline,
    RouterLink,
    Spinner,
  ],
  template: `
    <app-admin-page-header
      title="Demandes"
      subtitle="Toutes les demandes envoyées aux prestataires, avec leur avancement."
      ><app-export-button actions [exporter]="exportCsv"
    /></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <div
        class="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="statusFilter() === null"
          [class]="chip(statusFilter() === null)"
          (click)="selectStatus(null)"
        >
          Toutes
          @if (showCounts() && stats.data(); as figures) {
            <span [class]="countClass(statusFilter() === null)">{{ figures.total }}</span>
          }
        </button>
        @for (option of statuses; track option) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="statusFilter() === option"
            [class]="chip(statusFilter() === option)"
            (click)="selectStatus(option)"
          >
            {{ statusLabels[option] }}
            @if (showCounts() && stats.data(); as figures) {
              <span [class]="countClass(statusFilter() === option)">{{
                figures.byStatus[option]
              }}</span>
            }
          </button>
        }
      </div>

      <div class="mt-4 flex flex-wrap items-end gap-3">
        <app-multi-select-chip
          label="Services"
          searchPlaceholder="Rechercher un service"
          [options]="serviceOptions()"
          [(value)]="serviceFilter"
        />
        <label class="flex flex-col gap-1 text-label text-foreground">
          Créées du
          <input
            type="date"
            [class]="inputClasses + ' w-44'"
            [value]="from() ?? ''"
            (change)="setDate('from', $any($event.target).value)"
          />
        </label>
        <label class="flex flex-col gap-1 text-label text-foreground">
          au
          <input
            type="date"
            [class]="inputClasses + ' w-44'"
            [value]="to() ?? ''"
            (change)="setDate('to', $any($event.target).value)"
          />
        </label>
        @if (organizationFilter() !== null) {
          <button type="button" [class]="chip(true)" (click)="organizationFilter.set(null)">
            Entreprise n° {{ organizationFilter() }}
            <svg appIcon name="x" class="size-3.5"></svg>
          </button>
        }
        @if (userFilter() !== null) {
          <button type="button" [class]="chip(true)" (click)="userFilter.set(null)">
            Client n° {{ userFilter() }}
            <svg appIcon name="x" class="size-3.5"></svg>
          </button>
        }
        @if (from() || to()) {
          <button appButton variant="ghost" size="sm" type="button" (click)="clearDates()">
            Effacer les dates
          </button>
        }
      </div>

      <app-card class="mt-4 p-0">
        @if (requests.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else if (requests.data(); as page) {
          <ul class="divide-y divide-border-subtle">
            @for (request of page.content; track request.id) {
              <li class="px-4 py-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-label text-foreground">
                      {{ request.service.name ?? 'Service n° ' + request.service.id }}
                      <span class="text-caption font-normal text-foreground-muted"
                        >n° {{ request.id }}</span
                      >
                    </p>
                    <p class="text-body-sm text-foreground-secondary">
                      @if (request.customer; as customer) {
                        <a
                          [routerLink]="['/admin/users', customer.id]"
                          class="hover:text-primary hover:underline"
                          >{{ customer.fullName }}</a
                        >
                      }
                      @if (request.organization; as organization) {
                        →
                        <a
                          [routerLink]="['/admin/organizations', organization.id]"
                          class="hover:text-primary hover:underline"
                          >{{ organization.name }}</a
                        >
                      }
                    </p>
                    <p class="text-caption text-foreground-muted">
                      Souhaitée le {{ format(request.desiredDate) }} ·
                      {{ locationLabels[request.locationType] }} · envoyée le
                      {{ format(request.createdAt) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <app-request-status-badge [status]="request.status" />
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="opened.set(request)"
                    >
                      Détails
                    </button>
                  </div>
                </div>
              </li>
            } @empty {
              <li>
                <app-empty-state
                  image="empty-requests"
                  size="sm"
                  title="Aucune demande"
                  description="Aucune demande ne correspond à ces filtres."
                />
              </li>
            }
          </ul>
          @if (page.page.totalPages > 1) {
            <div
              class="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-body-sm"
            >
              <span class="text-foreground-secondary"
                >Page {{ page.page.number + 1 }} / {{ page.page.totalPages }}</span
              >
              <div class="flex gap-2">
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [disabled]="page.page.number === 0"
                  (click)="pageIndex.set(page.page.number - 1)"
                >
                  Précédent
                </button>
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [disabled]="page.page.number + 1 >= page.page.totalPages"
                  (click)="pageIndex.set(page.page.number + 1)"
                >
                  Suivant
                </button>
              </div>
            </div>
          }
        }
      </app-card>

      <app-drawer
        [title]="(opened()?.service?.name ?? 'Demande') + ' · n° ' + (opened()?.id ?? '')"
        [description]="opened()?.organization?.name ?? null"
        [open]="opened() !== null"
        (closed)="opened.set(null)"
      >
        @if (opened(); as request) {
          <div class="flex flex-col gap-6 text-body-sm">
            <div class="flex flex-wrap items-center gap-2">
              <app-request-status-badge [status]="request.status" />
              <span class="text-caption text-foreground-muted"
                >Souhaitée le {{ format(request.desiredDate) }} ·
                {{ locationLabels[request.locationType] }}</span
              >
            </div>
            <dl class="flex flex-col gap-2">
              @if (request.vehicle; as vehicle) {
                <div>
                  <dt class="text-caption text-foreground-muted">Véhicule</dt>
                  <dd>
                    {{ vehicle.brand }} {{ vehicle.model }} ({{ vehicle.year }}) ·
                    {{ vehicle.mileage }} km
                    @if (vehicle.plate) {
                      · <span class="text-plate">{{ vehicle.plate }}</span>
                    }
                  </dd>
                </div>
              }
              @if (request.location) {
                <div>
                  <dt class="text-caption text-foreground-muted">Adresse</dt>
                  <dd>{{ request.location }}</dd>
                </div>
              }
              @if (request.note) {
                <div>
                  <dt class="text-caption text-foreground-muted">Note du client</dt>
                  <dd>{{ request.note }}</dd>
                </div>
              }
              @if (request.rejectionReason ?? request.cancellationReason; as reason) {
                <div>
                  <dt class="text-caption text-foreground-muted">Motif</dt>
                  <dd>{{ reason }}</dd>
                </div>
              }
              @if (request.customer; as customer) {
                <div>
                  <dt class="text-caption text-foreground-muted">Contact</dt>
                  <dd>{{ customer.email }} · {{ customer.phone ?? '—' }}</dd>
                </div>
              }
            </dl>
            <div>
              @if (history.isPending()) {
                <app-spinner />
              } @else if (history.data(); as changes) {
                <app-request-timeline [history]="changes" />
              }
            </div>
          </div>
        }
        @if (opened(); as request) {
          @if (request.customer; as customer) {
            <a
              footer
              appButton
              variant="secondary"
              [routerLink]="['/admin/users', customer.id]"
              (click)="opened.set(null)"
              >Fiche client</a
            >
          }
          @if (request.organization; as organization) {
            <a
              footer
              appButton
              [routerLink]="['/admin/organizations', organization.id]"
              (click)="opened.set(null)"
              >Entreprise</a
            >
          }
        }
      </app-drawer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRequestsPage {
  /** Query params, bound by withComponentInputBinding(). */
  readonly status = input<string>();
  readonly organizationId = input<string>();
  readonly userId = input<string>();

  protected readonly statuses = REQUEST_STATUSES;
  protected readonly statusLabels = requestStatusLabels;
  protected readonly locationLabels = locationLabels;
  protected readonly inputClasses = inputClasses;

  protected readonly statusFilter = linkedSignal<RequestStatus | null>(() => {
    const value = this.status();
    return (REQUEST_STATUSES as readonly string[]).includes(value ?? '')
      ? (value as RequestStatus)
      : null;
  });
  protected readonly organizationFilter = linkedSignal(() => toId(this.organizationId()));
  protected readonly userFilter = linkedSignal(() => toId(this.userId()));
  protected readonly serviceFilter = signal<number[]>([]);
  private readonly services = injectActiveAutoServicesQuery();
  protected readonly serviceOptions = computed<MultiSelectOption<number>[]>(() =>
    (this.services.data() ?? []).map((service) => ({ value: service.id, label: service.name })),
  );
  protected readonly from = signal<string | null>(null);
  protected readonly to = signal<string | null>(null);
  protected readonly pageIndex = linkedSignal(() => {
    // Back to the first page whenever a filter changes.
    this.statusFilter();
    this.serviceFilter();
    this.organizationFilter();
    this.userFilter();
    this.from();
    this.to();
    return 0;
  });
  protected readonly opened = signal<ServiceRequest | null>(null);

  protected readonly requests = injectAdminRequestsQuery(() => ({
    status: this.statusFilter(),
    serviceIds: this.serviceFilter(),
    organizationId: this.organizationFilter(),
    userId: this.userFilter(),
    from: this.from(),
    to: this.to(),
    page: this.pageIndex(),
  }));
  private readonly exportRequests = injectAdminRequestsCsvExport();
  protected readonly exportCsv = () =>
    this.exportRequests({
      status: this.statusFilter(),
      serviceIds: this.serviceFilter(),
      organizationId: this.organizationFilter(),
      userId: this.userFilter(),
      from: this.from(),
      to: this.to(),
      page: 0,
    });
  protected readonly stats = injectAdminRequestStatsQuery(() => true);
  protected readonly history = injectAdminRequestHistoryQuery(() => this.opened()?.id ?? null);

  // Platform-wide figures: hidden once the list is narrowed to one client, garage or period.
  protected readonly showCounts = computed(
    () =>
      this.organizationFilter() === null &&
      this.userFilter() === null &&
      !this.from() &&
      !this.to(),
  );

  protected selectStatus(status: RequestStatus | null): void {
    this.statusFilter.set(status);
  }

  protected setDate(which: 'from' | 'to', value: string): void {
    (which === 'from' ? this.from : this.to).set(value || null);
  }

  protected clearDates(): void {
    this.from.set(null);
    this.to.set(null);
  }

  protected chip(selected: boolean): string {
    return chipClass(selected);
  }

  protected countClass(selected: boolean): string {
    return chipCountClass(selected);
  }

  protected format(value: string): string {
    return dateFormat.format(new Date(value));
  }
}

function toId(value: string | undefined): number | null {
  const id = Number(value);
  return value && Number.isInteger(id) && id > 0 ? id : null;
}
