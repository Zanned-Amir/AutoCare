import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { OrganizationForm } from '@features/organizations/components/organization-form';
import { OrganizationStatusBadge } from '@features/organizations/components/organization-status-badge';
import {
  injectAdminOrganizationsQuery,
  injectOrganizationsCsvExport,
  injectGovernoratesQuery,
  injectModerateOrganizationMutation,
  injectOrganizationDocumentsForReviewQuery,
} from '@features/organizations/organizations.queries';
import {
  Organization,
  OrganizationStatus,
  OrganizationType,
} from '@features/organizations/organizations.types';
import {
  ExportButton,
  Button,
  Card,
  ConfirmDialog,
  FilterGroup,
  FilterToolbar,
  FilterValues,
  Modal,
  Spinner,
  chipClass,
} from '@shared/ui';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

const DEFAULT_SORT = 'createdAt,desc';

const FILTERS: { status: OrganizationStatus | null; label: string }[] = [
  { status: 'PENDING', label: 'À valider' },
  { status: 'APPROVED', label: 'Validées' },
  { status: 'SUSPENDED', label: 'Suspendues' },
  { status: null, label: 'Toutes' },
];

@Component({
  selector: 'app-admin-organizations-page',
  imports: [
    AdminPageHeader,
    ExportButton,
    Button,
    Card,
    ConfirmDialog,
    FilterToolbar,
    Modal,
    OrganizationForm,
    OrganizationStatusBadge,
    RouterLink,
    Spinner,
  ],
  template: `
    <app-admin-page-header
      title="Entreprises"
      subtitle="Validez les garages et gérez leur statut dans la recherche."
    >
      <app-export-button actions [exporter]="exportCsv" />
      <button appButton actions type="button" (click)="creating.set(true)">
        Nouvelle entreprise
      </button>
    </app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <app-modal
        size="xl"
        title="Nouvelle entreprise"
        description="Pour un garage qui s’est inscrit par téléphone ou en agence : il en devient le propriétaire."
        [open]="creating()"
        (closed)="creating.set(false)"
      >
        @if (creating()) {
          <app-organization-form
            mode="admin"
            (saved)="created($event)"
            (cancelled)="creating.set(false)"
          />
        }
      </app-modal>
      <app-confirm-dialog
        [open]="suspendTarget() !== null"
        tone="danger"
        icon="building"
        title="Suspendre cette entreprise ?"
        [description]="
          (suspendTarget()?.name ?? '') +
          ' disparaît de la recherche et ne reçoit plus de demandes. Vous pourrez la valider à nouveau.'
        "
        confirmLabel="Suspendre"
        [busy]="moderate.isPending()"
        [error]="actionError()"
        (confirmed)="confirmSuspend()"
        (cancelled)="suspendTarget.set(null)"
      />

      @if (createdName(); as name) {
        <p class="mb-4 rounded-2xl bg-success-subtle px-4 py-3 text-body-sm text-success">
          {{ name }} est créée.
        </p>
      }
      <div
        class="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        role="tablist"
      >
        @for (filter of filters; track filter.label) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="status() === filter.status"
            [class]="tabClass(filter.status)"
            (click)="selectStatus(filter.status)"
          >
            {{ filter.label }}
          </button>
        }
      </div>

      <app-filter-toolbar
        class="mt-4"
        searchPlaceholder="Nom, ville ou téléphone"
        [search]="q()"
        [groups]="filterGroups()"
        [values]="{ type: type(), governorate: governorate() }"
        [sortOptions]="sortOptions"
        [sort]="sort()"
        [canReset]="narrowed()"
        (searchChange)="q.set($event); pageIndex.set(0)"
        (filtersChange)="applyFilters($event)"
        (sortChange)="sort.set($event); pageIndex.set(0)"
        (resetAll)="resetFilters()"
      />

      @if (actionError(); as message) {
        <p class="mt-4 rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }

      <app-card class="mt-4 p-0">
        @if (organizations.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else if (organizations.data(); as page) {
          <ul class="divide-y divide-border-subtle">
            @for (organization of page.content; track organization.id) {
              <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <a
                    [routerLink]="['/admin/organizations', organization.id]"
                    class="text-label text-foreground hover:text-primary hover:underline"
                    >{{ organization.name }}</a
                  >
                  <p class="text-body-sm text-foreground-secondary">
                    {{ organization.city }}, {{ organization.governorate }} ·
                    {{ organization.phone }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="
                      documentsFor.set(documentsFor() === organization.id ? null : organization.id)
                    "
                  >
                    Documents
                  </button>
                  <app-organization-status-badge [status]="organization.status" />
                  @if (organization.status !== 'APPROVED') {
                    <button
                      appButton
                      size="sm"
                      type="button"
                      [disabled]="moderate.isPending()"
                      (click)="approve(organization)"
                    >
                      Valider
                    </button>
                  }
                  @if (organization.status !== 'SUSPENDED') {
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="actionError.set(null); suspendTarget.set(organization)"
                    >
                      Suspendre
                    </button>
                  }
                </div>
                @if (documentsFor() === organization.id) {
                  <div class="w-full rounded-control bg-surface-muted px-3 py-2 text-body-sm">
                    @for (document of documents.data() ?? []; track document.id) {
                      <a
                        [href]="document.url"
                        target="_blank"
                        rel="noopener"
                        class="mr-4 text-primary underline"
                        >{{ document.originalName }}</a
                      >
                    } @empty {
                      <span class="text-foreground-muted">Aucun document envoyé.</span>
                    }
                  </div>
                }
              </li>
            } @empty {
              <li class="px-4 py-6 text-body-sm text-foreground-muted">Aucune entreprise.</li>
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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrganizationsPage {
  protected readonly documentsFor = signal<number | null>(null);
  protected readonly documents = injectOrganizationDocumentsForReviewQuery(() =>
    this.documentsFor(),
  );
  protected readonly filters = FILTERS;
  protected readonly status = signal<OrganizationStatus | null>('PENDING');
  protected readonly pageIndex = signal(0);
  protected readonly suspendTarget = signal<Organization | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly q = signal('');
  protected readonly type = signal<OrganizationType | null>(null);
  protected readonly governorate = signal<string | null>(null);
  protected readonly sort = signal(DEFAULT_SORT);
  protected readonly sortOptions = [
    { value: 'createdAt,desc', label: 'Plus récentes' },
    { value: 'createdAt,asc', label: 'Plus anciennes' },
    { value: 'name,asc', label: 'Nom (A → Z)' },
  ];
  private readonly governorates = injectGovernoratesQuery();
  protected readonly filterGroups = computed<FilterGroup[]>(() => [
    {
      key: 'type',
      label: 'Activité',
      options: [
        { value: 'PROVIDER', label: 'Garages et services' },
        { value: 'SELLER', label: 'Vendeurs de pièces' },
      ],
    },
    {
      key: 'governorate',
      label: 'Gouvernorat',
      searchable: true,
      options: (this.governorates.data() ?? []).map((name) => ({ value: name, label: name })),
    },
  ]);
  protected readonly narrowed = computed(
    () => !!this.q() || !!this.type() || !!this.governorate() || this.sort() !== DEFAULT_SORT,
  );
  protected readonly organizations = injectAdminOrganizationsQuery(() => ({
    status: this.status(),
    page: this.pageIndex(),
    filters: {
      q: this.q(),
      type: this.type(),
      governorate: this.governorate(),
      sort: this.sort(),
    },
  }));
  private readonly exportOrganizations = injectOrganizationsCsvExport();
  protected readonly exportCsv = () =>
    this.exportOrganizations(this.status(), {
      q: this.q(),
      type: this.type(),
      governorate: this.governorate(),
      sort: this.sort(),
    });
  protected readonly moderate = injectModerateOrganizationMutation();
  /** ?new=1 (dashboard shortcut) opens the create form. */
  readonly new = input<string>();
  protected readonly creating = linkedSignal(() => this.new() === '1');
  protected readonly createdName = signal<string | null>(null);

  protected created(organization: Organization): void {
    this.creating.set(false);
    this.createdName.set(organization.name);
    this.selectStatus(organization.status);
  }

  protected applyFilters(values: FilterValues): void {
    this.type.set((values['type'] as OrganizationType | null) ?? null);
    this.governorate.set(values['governorate'] ?? null);
    this.pageIndex.set(0);
  }

  protected resetFilters(): void {
    this.q.set('');
    this.type.set(null);
    this.governorate.set(null);
    this.sort.set(DEFAULT_SORT);
    this.pageIndex.set(0);
  }

  protected selectStatus(status: OrganizationStatus | null): void {
    this.status.set(status);
    this.pageIndex.set(0);
  }

  protected tabClass(status: OrganizationStatus | null): string {
    return chipClass(this.status() === status);
  }

  protected approve(organization: Organization): void {
    this.run(organization.id, 'approve');
  }

  protected confirmSuspend(): void {
    const organization = this.suspendTarget();
    if (!organization) return;
    this.actionError.set(null);
    this.moderate.mutate(
      { id: organization.id, action: 'suspend' },
      {
        onSuccess: () => this.suspendTarget.set(null),
        onError: (error) => this.actionError.set(problemMessage(error, 'Action impossible')),
      },
    );
  }

  private run(id: number, action: 'approve' | 'suspend'): void {
    this.actionError.set(null);
    this.moderate.mutate(
      { id, action },
      { onError: (error) => this.actionError.set(problemMessage(error, 'Action impossible')) },
    );
  }
}
