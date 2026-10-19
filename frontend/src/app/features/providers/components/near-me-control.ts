import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { Icon } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { LocationStore } from '@store/location.store';
import { injectGovernorateLocationsQuery } from '../providers.queries';

const RADII: { km: number | null; label: string }[] = [
  { km: 5, label: '5 km' },
  { km: 10, label: '10 km' },
  { km: 25, label: '25 km' },
  { km: 50, label: '50 km' },
  { km: null, label: 'Partout' },
];

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "Position" field with a menu: browser position, a governorate (searchable), the radius. */
@Component({
  selector: 'app-near-me-control',
  imports: [Icon],
  template: `
    <div class="relative">
      <button
        type="button"
        [class]="triggerClass()"
        [attr.aria-expanded]="open()"
        aria-haspopup="dialog"
        (click)="toggle()"
      >
        <span
          [class]="
            location.position()
              ? 'grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'
              : 'grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary'
          "
        >
          <svg appIcon name="locate" class="size-4"></svg>
        </span>
        <span class="min-w-0 flex-1 leading-tight">
          <span class="block text-caption text-foreground-muted">Position</span>
          <span class="block truncate text-body-sm font-semibold text-foreground">
            @if (location.status() === 'locating') {
              Localisation…
            } @else if (location.label(); as label) {
              {{ label }} · {{ radiusLabel() }}
            } @else {
              Toute la Tunisie
            }
          </span>
        </span>
        <svg
          appIcon
          name="chevron-down"
          [class]="cn('size-4 text-foreground-muted transition-transform', open() && 'rotate-180')"
        ></svg>
      </button>

      @if (open()) {
        <div
          role="dialog"
          aria-label="Choisir une position"
          class="absolute inset-x-0 top-[calc(100%+8px)] z-[500] overflow-hidden rounded-card border border-border-subtle bg-surface shadow-[var(--shadow-raised)]"
        >
          <div class="p-2">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-background-subtle"
              (click)="location.locate()"
            >
              <span
                class="grid size-9 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary"
                ><svg appIcon name="navigation" class="size-4"></svg
              ></span>
              <span class="min-w-0 flex-1">
                <span class="block text-label text-foreground">Utiliser ma position</span>
                @if (location.status() === 'locating') {
                  <span class="block text-caption text-foreground-muted">Localisation…</span>
                } @else if (location.status() === 'denied') {
                  <span class="block text-caption text-error"
                    >Autorisation refusée : choisissez un gouvernorat.</span
                  >
                } @else if (location.status() === 'unavailable') {
                  <span class="block text-caption text-error">Position indisponible.</span>
                } @else {
                  <span class="block text-caption text-foreground-muted"
                    >Les garages les plus proches de vous d’abord</span
                  >
                }
              </span>
              @if (location.source() === 'gps') {
                <svg appIcon name="check" class="size-4 text-primary"></svg>
              }
            </button>
          </div>

          <div class="border-t border-border-subtle px-4 pt-3 pb-2">
            <p class="text-overline text-foreground-muted">Gouvernorat</p>
            <div class="relative mt-2">
              <svg
                appIcon
                name="search"
                class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-muted"
              ></svg>
              <input
                aria-label="Chercher un gouvernorat"
                placeholder="Tunis, Sfax, Sousse…"
                [value]="filter()"
                (input)="filter.set($any($event.target).value)"
                class="h-10 w-full rounded-full border border-transparent bg-background-subtle pr-3 pl-9 text-body-sm placeholder:text-foreground-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <ul class="max-h-52 overflow-y-auto px-2 pb-2">
            @for (place of filteredPlaces(); track place.name) {
              <li>
                <button
                  type="button"
                  [class]="placeClass(place.name)"
                  (click)="choose(place.name, place.latitude, place.longitude)"
                >
                  <svg appIcon name="map-pin" class="size-4 shrink-0 text-foreground-muted"></svg>
                  <span class="flex-1 truncate">{{ place.name }}</span>
                  @if (isChosen(place.name)) {
                    <svg appIcon name="check" class="size-4 text-primary"></svg>
                  }
                </button>
              </li>
            } @empty {
              <li class="px-3 py-3 text-body-sm text-foreground-muted">Aucun gouvernorat trouvé</li>
            }
          </ul>

          <div class="border-t border-border-subtle bg-background-subtle px-4 py-3">
            <p class="text-overline text-foreground-muted">Rayon</p>
            <div class="mt-2 grid grid-cols-5 gap-1 rounded-full bg-surface p-1 shadow-xs">
              @for (radius of radii; track radius.label) {
                <button
                  type="button"
                  [class]="radiusClass(radius.km)"
                  [attr.aria-pressed]="location.radiusKm() === radius.km"
                  (click)="location.setRadius(radius.km)"
                >
                  {{ radius.label }}
                </button>
              }
            </div>
            @if (location.position()) {
              <button
                type="button"
                class="mt-3 text-caption font-semibold text-foreground-secondary underline-offset-2 hover:text-error hover:underline"
                (click)="clear()"
              >
                Ne plus utiliser de position
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOutside($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
})
export class NearMeControl {
  protected readonly location = inject(LocationStore);
  protected readonly places = injectGovernorateLocationsQuery();
  protected readonly radii = RADII;
  protected readonly cn = cn;
  protected readonly open = signal(false);
  protected readonly filter = signal('');
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly filteredPlaces = computed(() => {
    const query = fold(this.filter().trim());
    const places = this.places.data() ?? [];
    return query ? places.filter((p) => fold(p.name).includes(query)) : places;
  });

  protected readonly triggerClass = computed(() =>
    cn(
      'flex h-[52px] w-full items-center gap-3 rounded-full border bg-surface pr-4 pl-2 text-left transition-colors',
      this.open() ? 'border-primary' : 'border-border hover:border-border-strong',
    ),
  );

  protected toggle(): void {
    this.filter.set('');
    this.open.set(!this.open());
  }

  protected radiusLabel(): string {
    const km = this.location.radiusKm();
    return km === null ? 'toute la Tunisie' : `${km} km`;
  }

  protected isChosen(name: string): boolean {
    return this.location.source() === 'place' && this.location.label() === name;
  }

  protected placeClass(name: string): string {
    return cn(
      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-body-sm hover:bg-background-subtle',
      this.isChosen(name) ? 'font-semibold text-primary' : 'text-foreground',
    );
  }

  protected choose(name: string, latitude: number, longitude: number): void {
    this.location.choosePlace(name, latitude, longitude);
    this.open.set(false);
  }

  protected clear(): void {
    this.location.clear();
    this.open.set(false);
  }

  protected radiusClass(km: number | null): string {
    return cn(
      'h-8 rounded-full text-caption font-semibold transition-colors',
      this.location.radiusKm() === km
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground-secondary hover:bg-background-subtle',
    );
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }
}
