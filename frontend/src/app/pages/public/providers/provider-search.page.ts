import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import { NearMeControl } from '@features/providers/components/near-me-control';
import { ProviderCard } from '@features/providers/components/provider-card';
import { injectProviderSearchQuery } from '@features/providers/providers.queries';
import { ProviderSearchParams } from '@features/providers/providers.types';
import { injectRatingsQuery } from '@features/reviews/reviews.queries';
import { serviceIcon } from '@features/catalog/catalog.icons';
import { Button, EmptyState, Icon, SearchSelect, SearchSelectOption, Spinner } from '@shared/ui';
import { AppMap, MapMarker } from '@shared/ui/map';
import { cn } from '@shared/utils/cn';
import { formatDistance } from '@shared/utils/distance';
import { formatMoney } from '@shared/utils/money';
import { LocationStore } from '@store/location.store';

/**
 * Map search (Uber-like): results on the left, the map on the right; on mobile one or the
 * other with a toggle. The URL holds the filters (?q=&serviceId=&atHome=&page=); the
 * position stays in LocationStore, never in the URL.
 */
@Component({
  selector: 'app-provider-search-page',
  imports: [
    AppMap,
    Button,
    EmptyState,
    Icon,
    NearMeControl,
    ProviderCard,
    RouterLink,
    SearchSelect,
    Spinner,
  ],
  template: `
    <div
      class="relative flex h-[calc(100dvh-var(--site-header)-4rem)] min-h-[520px] md:h-[calc(100dvh-var(--site-header))]"
    >
      <section [class]="listClass()">
        <div class="flex flex-col gap-3 border-b border-border-subtle px-5 pt-5 pb-4">
          <form role="search" class="relative" (submit)="applyText($event)">
            <svg
              appIcon
              name="search"
              class="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-foreground-muted"
            ></svg>
            <input
              aria-label="Rechercher"
              placeholder="Garage, service, ville…"
              [value]="qDraft()"
              (input)="qDraft.set($any($event.target).value)"
              class="h-[52px] w-full rounded-full border border-transparent bg-background-subtle pr-4 pl-12 text-body placeholder:text-foreground-muted focus:border-accent focus:bg-surface focus:outline-none"
            />
          </form>
          <app-near-me-control />

          <app-search-select
            label="Service"
            allLabel="Tous les services"
            searchPlaceholder="Rechercher un service"
            icon="wrench"
            [options]="serviceOptions()"
            [value]="params().serviceId"
            (valueChange)="update({ serviceId: $event })"
          />
          <div class="flex justify-end">
            <button
              type="button"
              role="switch"
              [attr.aria-checked]="params().atHome"
              class="flex items-center gap-2 text-caption font-semibold text-foreground-secondary"
              (click)="update({ atHome: !params().atHome })"
            >
              À domicile
              <span [class]="switchClass(params().atHome)">
                <span
                  class="size-4 rounded-full bg-white shadow-sm transition-transform"
                  [class.translate-x-4]="params().atHome"
                ></span>
              </span>
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between px-5 py-3 text-caption text-foreground-muted">
          <span
            ><strong class="text-foreground">{{ results.data()?.page?.totalElements ?? 0 }}</strong>
            résultat(s)</span
          >
          <span>{{
            location.position() ? 'Les plus proches d’abord' : 'Par ordre alphabétique'
          }}</span>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          @if (results.isPending()) {
            <div class="py-10"><app-spinner /></div>
          } @else if (results.isError()) {
            <p class="py-6 text-body-sm text-error">Recherche impossible pour le moment.</p>
          } @else {
            <div class="flex flex-col gap-2.5">
              @for (provider of results.data()?.content ?? []; track provider.organizationId) {
                <app-provider-card
                  [id]="'provider-' + provider.organizationId"
                  [provider]="provider"
                  [rating]="ratings.data()?.[provider.organizationId] ?? null"
                  [highlightServiceId]="params().serviceId"
                  [diagnosticId]="diagnosticId() ?? null"
                  [active]="activeId() === provider.organizationId"
                  (mouseenter)="hovered.set(provider.organizationId)"
                  (mouseleave)="hovered.set(null)"
                />
              } @empty {
                <app-empty-state
                  image="empty-search"
                  size="sm"
                  title="Aucun professionnel ici"
                  description="Élargissez le rayon ou retirez un filtre."
                >
                  @if (location.radiusKm() !== null && location.position()) {
                    <button
                      appButton
                      variant="secondary"
                      size="sm"
                      type="button"
                      (click)="location.setRadius(null)"
                    >
                      Chercher dans toute la Tunisie
                    </button>
                  }
                </app-empty-state>
              }
            </div>
            @if ((results.data()?.page?.totalPages ?? 0) > 1) {
              <div class="mt-4 flex items-center justify-between text-body-sm">
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [disabled]="params().page === 0"
                  (click)="update({ page: params().page - 1 }, false)"
                >
                  Précédent
                </button>
                <span class="text-foreground-muted"
                  >Page {{ params().page + 1 }} / {{ results.data()?.page?.totalPages }}</span
                >
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [disabled]="params().page + 1 >= (results.data()?.page?.totalPages ?? 0)"
                  (click)="update({ page: params().page + 1 }, false)"
                >
                  Suivant
                </button>
              </div>
            }
          }
        </div>
      </section>

      <section [class]="mapClass()">
        <app-map
          class="absolute inset-0"
          [markers]="markers()"
          [activeId]="activeId()"
          [me]="location.position()"
          (markerClick)="select($event)"
        />
        @if (selected(); as provider) {
          <div
            class="absolute inset-x-3 bottom-3 z-[450] mx-auto max-w-md rounded-2xl bg-surface p-4 shadow-2xl"
          >
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-h4 text-foreground">{{ provider.name }}</p>
                <p class="text-caption text-foreground-muted">
                  {{ provider.city }}, {{ provider.governorate }}
                  @if (provider.distanceKm !== null) {
                    · <strong class="text-foreground">{{ distance(provider.distanceKm) }}</strong>
                  }
                </p>
                @if (provider.services[0]; as first) {
                  <p class="mt-1 text-body-sm text-foreground-secondary">
                    {{ first.serviceName }} ·
                    {{ first.indicativePrice ? money(first.indicativePrice) : 'sur devis' }}
                  </p>
                }
              </div>
              <button
                type="button"
                class="grid size-8 place-items-center rounded-full hover:bg-surface-muted"
                aria-label="Fermer"
                (click)="selectedId.set(null)"
              >
                <svg appIcon name="x" class="size-4"></svg>
              </button>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <a
                appButton
                variant="secondary"
                [routerLink]="['/providers', provider.organizationId]"
                [queryParams]="{ diagnosticId: diagnosticId() ?? null }"
                >Profil</a
              >
              <a
                appButton
                variant="accent"
                routerLink="/requests/new"
                [queryParams]="{
                  organizationId: provider.organizationId,
                  serviceId: params().serviceId,
                  diagnosticId: diagnosticId() ?? null,
                }"
                >Demander</a
              >
            </div>
          </div>
        }
      </section>

      <button
        type="button"
        class="fixed bottom-20 left-1/2 z-[460] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-body-sm font-semibold text-background shadow-2xl md:hidden"
        (click)="view.set(view() === 'list' ? 'map' : 'list')"
      >
        <svg appIcon [name]="view() === 'list' ? 'map' : 'list'" class="size-4"></svg
        >{{ view() === 'list' ? 'Carte' : 'Liste' }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderSearchPage {
  // Query params, bound by withComponentInputBinding().
  readonly q = input<string>();
  readonly serviceId = input<string>();
  readonly governorate = input<string>();
  readonly atHome = input<string>();
  readonly page = input<string>();
  readonly diagnosticId = input<string>();

  protected readonly location = inject(LocationStore);
  protected readonly services = injectActiveAutoServicesQuery();
  protected readonly serviceOptions = computed<SearchSelectOption<number>[]>(() =>
    (this.services.data() ?? []).map((service) => ({
      value: service.id,
      label: service.name,
      icon: serviceIcon(service.name, service.icon),
    })),
  );
  private readonly router = inject(Router);

  protected readonly params = computed<ProviderSearchParams>(() => ({
    q: this.q() ?? '',
    serviceId: this.toId(this.serviceId() ?? ''),
    governorate: this.governorate() || null,
    atHome: this.atHome() === 'true',
    page: Math.max(0, Number(this.page() ?? 0) || 0),
    size: 20,
    near: this.location.position()
      ? { ...this.location.position()!, radiusKm: this.location.radiusKm() }
      : null,
  }));
  protected readonly qDraft = linkedSignal(() => this.params().q);
  protected readonly results = injectProviderSearchQuery(() => this.params());
  protected readonly ratings = injectRatingsQuery(() =>
    (this.results.data()?.content ?? []).map((provider) => provider.organizationId),
  );
  protected readonly view = signal<'list' | 'map'>('list');
  protected readonly hovered = signal<number | null>(null);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly activeId = computed(() => this.hovered() ?? this.selectedId());
  protected readonly selected = computed(
    () => this.results.data()?.content.find((p) => p.organizationId === this.selectedId()) ?? null,
  );
  protected readonly markers = computed<MapMarker[]>(() =>
    (this.results.data()?.content ?? [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: p.organizationId,
        latitude: p.latitude!,
        longitude: p.longitude!,
        label: p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name,
        sublabel: p.distanceKm !== null ? formatDistance(p.distanceKm) : null,
        approximate: p.approximateLocation,
      })),
  );
  protected readonly listClass = computed(() =>
    cn(
      'flex min-h-0 w-full flex-col border-r border-border-subtle bg-surface md:w-[440px] md:flex lg:w-[480px]',
      this.view() === 'map' ? 'hidden' : 'flex',
    ),
  );
  protected readonly mapClass = computed(() =>
    cn('relative min-w-0 flex-1 md:block', this.view() === 'map' ? 'block' : 'hidden'),
  );

  protected select(id: number): void {
    this.selectedId.set(id);
    document
      .getElementById('provider-' + id)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  protected applyText(event: Event): void {
    event.preventDefault();
    this.update({ q: this.qDraft() });
  }

  /** Any filter change goes back to page 1. */
  protected update(change: Partial<ProviderSearchParams>, resetPage = true): void {
    const next = { ...this.params(), ...(resetPage ? { page: 0 } : {}), ...change };
    this.selectedId.set(null);
    void this.router.navigate([], {
      queryParams: {
        q: next.q.trim() || null,
        serviceId: next.serviceId,
        governorate: next.governorate,
        atHome: next.atHome ? 'true' : null,
        page: next.page > 0 ? next.page : null,
        diagnosticId: this.diagnosticId() ?? null,
      },
    });
  }

  protected readonly cn = cn;

  protected switchClass(on: boolean): string {
    return cn(
      'flex h-5 w-9 items-center rounded-full p-0.5 transition-colors',
      on ? 'bg-primary' : 'bg-border-strong',
    );
  }

  protected distance(km: number): string {
    return formatDistance(km);
  }

  protected money(value: string): string {
    return formatMoney(value);
  }

  protected toId(value: string): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
