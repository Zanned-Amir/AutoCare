import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { formatDistance } from '@shared/utils/distance';
import { formatMoney } from '@shared/utils/money';
import { RatingSummary } from '@features/reviews/reviews.types';
import { ProviderSearchResult } from '../providers.types';

/** Compact result row (Uber-like): logo, name, distance, top services with prices. */
@Component({
  selector: 'app-provider-card',
  imports: [Icon, RouterLink],
  template: `
    <a
      [routerLink]="['/providers', provider().organizationId]"
      [queryParams]="{ diagnosticId: diagnosticId() }"
      [class]="cardClass()"
    >
      <span
        class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-control bg-primary-subtle"
      >
        @if (provider().logoUrl ?? provider().photoUrls[0]; as picture) {
          <img [src]="picture" alt="" class="size-full object-cover" loading="lazy" />
        } @else {
          <span class="text-h4 text-primary">{{ initials() }}</span>
        }
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex items-start justify-between gap-2">
          <span class="truncate text-label text-foreground">{{ provider().name }}</span>
          @if (provider().distanceKm !== null) {
            <span
              class="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-caption font-semibold text-background"
              >{{ distance() }}</span
            >
          }
        </span>
        <span class="mt-0.5 flex items-center gap-1 truncate text-caption text-foreground-muted">
          <svg appIcon name="map-pin" class="size-3.5"></svg>{{ provider().city }},
          {{ provider().governorate }}
          @if (provider().approximateLocation) {
            <span title="Position approximative (centre du gouvernorat)">· zone</span>
          }
          @if (rating(); as stars) {
            <span
              class="ml-1 flex shrink-0 items-center gap-0.5 font-semibold text-foreground"
              [attr.aria-label]="'Note ' + stars.average + ' sur 5, ' + stars.count + ' avis'"
            >
              <svg appIcon name="star" class="size-3.5 fill-current text-accent"></svg
              >{{ stars.average.toFixed(1) }}
              <span class="font-normal text-foreground-muted">({{ stars.count }})</span>
            </span>
          }
        </span>
        <span class="mt-2 flex flex-wrap gap-1.5">
          @for (service of shownServices(); track service.id) {
            <span [class]="chipClass(service.serviceId)">
              {{ service.serviceName }} ·
              {{ service.indicativePrice ? formatMoney(service.indicativePrice) : 'devis' }}
            </span>
          }
          @if (atHome()) {
            <span
              class="rounded-full bg-info-subtle px-2 py-0.5 text-caption font-semibold text-info"
              >À domicile</span
            >
          }
        </span>
      </span>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ProviderCard {
  readonly provider = input.required<ProviderSearchResult>();
  /** From the review module, fetched for the whole page of results. */
  readonly rating = input<RatingSummary | null>(null);
  /** When the search filters on a service, show it first. */
  readonly highlightServiceId = input<number | null>(null);
  /** Carried to the profile so the request can link the diagnostic. */
  readonly diagnosticId = input<string | null>(null);
  readonly active = input(false);

  protected readonly formatMoney = formatMoney;
  protected readonly distance = computed(() => formatDistance(this.provider().distanceKm));
  protected readonly initials = computed(() =>
    this.provider()
      .name.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
  protected readonly atHome = computed(() =>
    this.provider().services.some((service) => service.atHome),
  );
  protected readonly shownServices = computed(() => {
    const id = this.highlightServiceId();
    return [...this.provider().services]
      .sort((a, b) => Number(b.serviceId === id) - Number(a.serviceId === id))
      .slice(0, 3);
  });
  protected readonly cardClass = computed(() =>
    cn(
      'flex gap-3 rounded-card border bg-surface p-3 transition hover:border-primary hover:shadow-card',
      this.active() ? 'border-primary ring-2 ring-primary/30' : 'border-border-subtle',
    ),
  );

  protected chipClass(serviceId: number): string {
    return cn(
      'rounded-full px-2 py-0.5 text-caption',
      serviceId === this.highlightServiceId()
        ? 'bg-primary-subtle font-semibold text-primary'
        : 'bg-surface-muted text-foreground-secondary',
    );
  }
}
