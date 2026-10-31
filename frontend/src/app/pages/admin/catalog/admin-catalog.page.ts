import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { AutoServiceForm } from '@features/catalog/components/auto-service-form';
import { serviceIcon } from '@features/catalog/catalog.icons';
import { CatalogPermissions } from '@features/catalog/catalog.permissions';
import { CatalogFiltersStore } from '@features/catalog/catalog-filters.store';
import {
  injectAutoServiceActivationMutation,
  injectAutoServiceSearchQuery,
} from '@features/catalog/catalog.queries';
import { AutoService } from '@features/catalog/catalog.types';
import { injectProviderCountsQuery } from '@features/providers/providers.queries';
import {
  Badge,
  Button,
  Card,
  FilterGroup,
  FilterToolbar,
  FilterValues,
  Icon,
  IconName,
  Modal,
  Spinner,
  EmptyState,
} from '@shared/ui';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

@Component({
  selector: 'app-admin-catalog-page',
  imports: [
    EmptyState,
    AdminPageHeader,
    AutoServiceForm,
    Badge,
    Button,
    Card,
    FilterToolbar,
    Icon,
    Modal,
    Spinner,
  ],
  providers: [CatalogFiltersStore],
  template: `
    <app-admin-page-header
      title="Services automobiles"
      subtitle="Les services que les garages peuvent proposer. Un service désactivé disparaît de la recherche et des nouvelles demandes."
    >
      @if (canManage()) {
        <button appButton actions type="button" (click)="editing.set('new')">
          Nouveau service
        </button>
      }
    </app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <app-modal
        [title]="editing() === 'new' ? 'Nouveau service' : 'Modifier le service'"
        [open]="editing() !== null"
        (closed)="editing.set(null)"
      >
        @if (editing(); as current) {
          <app-auto-service-form
            [service]="current === 'new' ? null : current"
            (saved)="editing.set(null)"
            (cancelled)="editing.set(null)"
          />
        }
      </app-modal>

      @if (actionError(); as message) {
        <p class="mt-6 rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }

      <app-card class="mt-6 p-0">
        <div class="border-b border-border-subtle p-4">
          <app-filter-toolbar
            searchPlaceholder="Rechercher un service"
            [search]="filters.q()"
            [groups]="filterGroups"
            [values]="{ status: statusValue() }"
            [sortOptions]="sortOptions"
            [sort]="filters.sort()"
            [canReset]="!!filters.q() || filters.active() !== null || filters.sort() !== 'name,asc'"
            (searchChange)="filters.setQuery($event)"
            (filtersChange)="applyFilters($event)"
            (sortChange)="filters.setSort($event)"
            (resetAll)="filters.reset()"
          />
        </div>
        @if (services.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else if (services.data(); as page) {
          <ul class="divide-y divide-border-subtle">
            @for (service of page.content; track service.id) {
              <li class="flex items-center justify-between gap-4 px-4 py-3">
                <span
                  class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary"
                  ><svg appIcon [name]="icon(service)" class="size-5"></svg
                ></span>
                <div class="min-w-0 flex-1">
                  <p class="text-label text-foreground">{{ service.name }}</p>
                  <p class="text-body-sm text-foreground-secondary">{{ service.description }}</p>
                  <p class="text-caption text-foreground-muted">
                    {{ providerCount(service.id) }} prestataire(s) le proposent
                  </p>
                </div>
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <app-badge [tone]="service.active ? 'success' : 'neutral'">
                    {{ service.active ? 'Actif' : 'Inactif' }}
                  </app-badge>
                  @if (canManage()) {
                    <button
                      appButton
                      variant="secondary"
                      size="sm"
                      type="button"
                      (click)="editing.set(service)"
                    >
                      Modifier
                    </button>
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      [disabled]="activation.isPending()"
                      (click)="setActive(service, !service.active)"
                    >
                      {{ service.active ? 'Désactiver' : 'Réactiver' }}
                    </button>
                  }
                </div>
              </li>
            } @empty {
              <li>
                <app-empty-state
                  image="empty-search"
                  size="sm"
                  title="Aucun service"
                  description="Aucun service ne correspond à cette recherche."
                />
              </li>
            }
          </ul>
        }
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCatalogPage {
  protected readonly filters = inject(CatalogFiltersStore);
  protected readonly services = injectAutoServiceSearchQuery(() => ({
    q: this.filters.q(),
    page: this.filters.page(),
    size: this.filters.size(),
    active: this.filters.active(),
    sort: this.filters.sort(),
  }));
  protected readonly filterGroups: FilterGroup[] = [
    {
      key: 'status',
      label: 'Statut',
      options: [
        { value: 'active', label: 'Actif' },
        { value: 'inactive', label: 'Désactivé' },
      ],
    },
  ];
  protected readonly sortOptions = [
    { value: 'name,asc', label: 'Nom (A → Z)' },
    { value: 'name,desc', label: 'Nom (Z → A)' },
    { value: 'createdAt,desc', label: 'Plus récents' },
  ];

  protected statusValue(): string | null {
    const active = this.filters.active();
    return active === null ? null : active ? 'active' : 'inactive';
  }

  protected applyFilters(values: FilterValues): void {
    this.filters.setActive(values['status'] ? values['status'] === 'active' : null);
  }
  protected readonly editing = signal<AutoService | 'new' | null>(null);
  private readonly auth = inject(AuthStore);
  protected readonly providerCounts = injectProviderCountsQuery();
  protected readonly activation = injectAutoServiceActivationMutation();
  protected readonly actionError = signal<string | null>(null);

  protected icon(service: AutoService): IconName {
    return serviceIcon(service.name, service.icon);
  }

  protected canManage(): boolean {
    return this.auth.can(CatalogPermissions.SERVICE_MANAGE);
  }

  protected providerCount(serviceId: number): number {
    return this.providerCounts.data()?.[serviceId] ?? 0;
  }

  /** A deactivated service leaves the catalog and search; offers and running requests stay. */
  protected setActive(service: AutoService, active: boolean): void {
    this.actionError.set(null);
    this.activation.mutate(
      { id: service.id, active },
      { onError: (error) => this.actionError.set(problemMessage(error, 'Action impossible')) },
    );
  }
}
