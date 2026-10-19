import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { serviceIcon } from '@features/catalog/catalog.icons';
import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import { injectProviderProfileQuery } from '@features/providers/providers.queries';
import { ReviewCard } from '@features/reviews/components/review-card';
import { StarRating } from '@features/reviews/components/star-rating';
import { injectProviderReviewsQueries } from '@features/reviews/reviews.queries';
import { Badge, Button, Card, Icon, IconName, Modal, Spinner } from '@shared/ui';
import { AppMap, MapMarker } from '@shared/ui/map';
import { formatMoney } from '@shared/utils/money';
import { LocationStore } from '@store/location.store';

@Component({
  selector: 'app-provider-profile-page',
  imports: [AppMap, Badge, Button, Card, Icon, Modal, ReviewCard, RouterLink, Spinner, StarRating],
  template: `
    <a
      routerLink="/providers"
      class="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
    >
      <svg appIcon name="arrow-left" class="size-4"></svg>Retour à la carte
    </a>

    @if (profile.isPending()) {
      <div class="mt-6"><app-spinner /></div>
    } @else if (profile.data(); as provider) {
      <div class="mt-4 flex flex-wrap items-center gap-4">
        <span
          class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-card border border-border-subtle bg-primary-subtle"
        >
          @if (provider.logoUrl; as logo) {
            <img [src]="logo" alt="" class="size-full object-cover" />
          } @else {
            <svg appIcon name="wrench" class="size-8 text-primary"></svg>
          }
        </span>
        <div class="min-w-0 flex-1">
          <h1 class="text-h1 text-primary">{{ provider.name }}</h1>
          <p
            class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-foreground-secondary"
          >
            <span class="flex items-center gap-1"
              ><svg appIcon name="map-pin" class="size-4"></svg>{{ provider.city }},
              {{ provider.governorate }}</span
            >
            @if (atHome()) {
              <app-badge tone="info">Service à domicile</app-badge>
            }
            <app-badge tone="success">Vérifié par AutoCare</app-badge>
            @if (reviews.rating.data(); as rating) {
              @if (rating.count) {
                <a href="#avis" class="flex items-center gap-1.5 hover:underline">
                  <app-star-rating [value]="rating.average" />
                  <span class="font-semibold text-foreground">{{ rating.average.toFixed(1) }}</span>
                  ({{ rating.count }} avis)
                </a>
              }
            }
          </p>
        </div>
      </div>

      @if (provider.photoUrls.length) {
        <div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          @for (photo of provider.photoUrls.slice(0, 5); track photo; let i = $index) {
            <button
              type="button"
              [class]="
                i === 0
                  ? 'relative col-span-2 row-span-2 h-56 overflow-hidden rounded-2xl sm:h-[296px]'
                  : 'relative hidden h-[144px] overflow-hidden rounded-2xl sm:block'
              "
              [attr.aria-label]="'Voir la photo ' + (i + 1)"
              (click)="openPhoto.set(i)"
            >
              <img
                [src]="photo"
                [alt]="'Photo ' + (i + 1) + ' de ' + provider.name"
                class="size-full object-cover transition-transform hover:scale-105"
                [attr.loading]="i === 0 ? null : 'lazy'"
              />
              @if (i === 4 && provider.photoUrls.length > 5) {
                <span
                  class="absolute inset-0 grid place-items-center bg-background-inverse/50 text-h4 text-white"
                  >+{{ provider.photoUrls.length - 5 }}</span
                >
              }
            </button>
          }
        </div>
        <app-modal
          size="xl"
          [title]="provider.name"
          [open]="openPhoto() !== null"
          (closed)="openPhoto.set(null)"
        >
          @if (openPhoto() !== null) {
            @let index = openPhoto()!;
            <img
              [src]="provider.photoUrls[index]"
              [alt]="'Photo ' + (index + 1) + ' de ' + provider.name"
              class="max-h-[60vh] w-full rounded-2xl object-contain"
            />
            <div class="mt-3 flex gap-2 overflow-x-auto">
              @for (photo of provider.photoUrls; track photo; let i = $index) {
                <button
                  type="button"
                  [attr.aria-label]="'Photo ' + (i + 1)"
                  [class]="
                    i === index
                      ? 'size-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-accent'
                      : 'size-16 shrink-0 overflow-hidden rounded-xl opacity-70 hover:opacity-100'
                  "
                  (click)="openPhoto.set(i)"
                >
                  <img [src]="photo" alt="" class="size-full object-cover" />
                </button>
              }
            </div>
          }
        </app-modal>
      }

      <div class="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div class="flex flex-col gap-6">
          @if (provider.description; as description) {
            <p class="text-body-lg text-foreground-secondary">{{ description }}</p>
          }
          <app-card class="p-0">
            <h2 class="border-b border-border-subtle p-4 text-h4">Services et tarifs indicatifs</h2>
            <ul class="divide-y divide-border-subtle">
              @for (service of provider.services; track service.id) {
                <li class="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span
                    class="grid size-10 place-items-center rounded-control bg-primary-subtle text-primary"
                    ><svg
                      appIcon
                      [name]="icon(service.serviceId, service.serviceName)"
                      class="size-5"
                    ></svg
                  ></span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-label text-foreground">{{ service.serviceName }}</span>
                    @if (service.atHome) {
                      <span class="text-caption text-info">Aussi à domicile</span>
                    }
                  </span>
                  <span class="text-price text-primary">{{
                    service.indicativePrice ? formatMoney(service.indicativePrice) : 'Sur devis'
                  }}</span>
                  <a
                    appButton
                    size="sm"
                    variant="secondary"
                    routerLink="/requests/new"
                    [queryParams]="{
                      organizationId: provider.organizationId,
                      serviceId: service.serviceId,
                      diagnosticId: diagnosticId() ?? null,
                    }"
                    >Demander</a
                  >
                </li>
              }
            </ul>
          </app-card>

          <app-card id="avis" class="flex flex-col gap-4">
            <h2 class="text-h4">Avis clients</h2>
            @if (reviews.rating.data(); as rating) {
              @if (rating.count) {
                <div class="flex flex-wrap items-center gap-6">
                  <div class="flex flex-col items-start">
                    <span class="text-h1 text-primary">{{ rating.average.toFixed(1) }}</span>
                    <app-star-rating size="md" [value]="rating.average" />
                    <span class="text-caption text-foreground-muted">{{ rating.count }} avis</span>
                  </div>
                  <ul class="flex min-w-48 flex-1 flex-col gap-1">
                    @for (stars of [5, 4, 3, 2, 1]; track stars) {
                      <li class="flex items-center gap-2 text-caption text-foreground-secondary">
                        <span class="w-3">{{ stars }}</span>
                        <span class="h-2 flex-1 overflow-hidden rounded-full bg-background-subtle">
                          <span
                            class="block h-full rounded-full bg-accent"
                            [style.width.%]="((rating.byRating[stars] ?? 0) / rating.count) * 100"
                          ></span>
                        </span>
                        <span class="w-6 text-right">{{ rating.byRating[stars] ?? 0 }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            }
            <ul class="flex flex-col divide-y divide-border-subtle">
              @for (review of reviews.reviews.data()?.content ?? []; track review.id) {
                <li class="py-4 first:pt-0"><app-review-card [review]="review" /></li>
              } @empty {
                <li class="text-body-sm text-foreground-secondary">
                  Pas encore d’avis : ils apparaissent après une intervention terminée.
                </li>
              }
            </ul>
            @if (reviews.reviews.data(); as page) {
              @if (page.page.number + 1 < page.page.totalPages) {
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  class="self-start"
                  (click)="reviewsPage.set(page.page.number + 1)"
                >
                  Avis plus anciens
                </button>
              }
            }
          </app-card>
        </div>

        <div class="flex flex-col gap-4 lg:sticky lg:top-36 lg:h-fit">
          <app-card class="overflow-hidden p-0">
            @if (marker(); as point) {
              <app-map
                class="h-56"
                [markers]="[point]"
                [activeId]="point.id"
                [me]="location.position()"
              />
            }
            <div class="flex flex-col gap-3 p-4">
              @if (provider.address; as address) {
                <p class="flex items-start gap-2 text-body-sm text-foreground">
                  <svg appIcon name="map-pin" class="mt-0.5 size-4 text-primary"></svg>{{ address }}
                </p>
              }
              @if (provider.approximateLocation) {
                <p class="text-caption text-foreground-muted">
                  Position approximative (centre du gouvernorat).
                </p>
              }
              @if (provider.serviceZone; as zone) {
                <p class="flex items-start gap-2 text-body-sm text-foreground-secondary">
                  <svg appIcon name="route" class="mt-0.5 size-4 text-primary"></svg>Intervient :
                  {{ zone }}
                </p>
              }
              <p class="flex items-center gap-2 text-plate text-foreground">
                <svg appIcon name="phone" class="size-4 text-primary"></svg>{{ provider.phone }}
              </p>
              <a
                appButton
                variant="accent"
                routerLink="/requests/new"
                [queryParams]="{
                  organizationId: provider.organizationId,
                  diagnosticId: diagnosticId() ?? null,
                }"
                >Demander un service</a
              >
              <div class="grid grid-cols-2 gap-2">
                <a appButton variant="secondary" [href]="'tel:' + provider.phone"
                  ><svg appIcon name="phone" class="mr-1.5 size-4"></svg>Appeler</a
                >
                @if (directions(); as url) {
                  <a appButton variant="secondary" [href]="url" target="_blank" rel="noopener"
                    ><svg appIcon name="navigation" class="mr-1.5 size-4"></svg>Itinéraire</a
                  >
                }
              </div>
            </div>
          </app-card>
        </div>
      </div>
    } @else {
      <app-card class="mt-6">
        <h1 class="text-h4">Professionnel introuvable</h1>
        <p class="mt-1 text-body-sm text-foreground-secondary">
          Ce profil n'existe pas ou n'est plus visible.
        </p>
      </app-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderProfilePage {
  /** Route param, bound by withComponentInputBinding(). */
  readonly organizationId = input.required<string>();
  /** Query param when coming from a diagnostic result. */
  readonly diagnosticId = input<string>();

  protected readonly location = inject(LocationStore);
  protected readonly formatMoney = formatMoney;
  protected readonly profile = injectProviderProfileQuery(() => Number(this.organizationId()));
  protected readonly reviewsPage = signal(0);
  protected readonly reviews = injectProviderReviewsQueries(
    () => Number(this.organizationId()),
    () => this.reviewsPage(),
  );
  /** Index of the photo shown in the viewer, null when closed. */
  protected readonly openPhoto = signal<number | null>(null);
  private readonly catalog = injectActiveAutoServicesQuery();
  protected readonly atHome = computed(
    () => this.profile.data()?.services.some((s) => s.atHome) ?? false,
  );
  protected readonly marker = computed<MapMarker | null>(() => {
    const p = this.profile.data();
    if (!p || p.latitude == null || p.longitude == null) return null;
    return {
      id: p.organizationId,
      latitude: p.latitude,
      longitude: p.longitude,
      label: p.name,
      approximate: p.approximateLocation,
    };
  });
  /** Only for a real address: a governorate centre would send people to the wrong place. */
  protected readonly directions = computed(() => {
    const p = this.profile.data();
    if (!p || p.approximateLocation || p.latitude === null || p.longitude === null) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  });

  /** The icon chosen in the catalog for that service. */
  protected icon(serviceId: number, name: string): IconName {
    const service = this.catalog.data()?.find((item) => item.id === serviceId);
    return serviceIcon(name, service?.icon);
  }
}
