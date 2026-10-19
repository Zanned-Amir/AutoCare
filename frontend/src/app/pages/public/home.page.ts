import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { serviceIcon } from '@features/catalog/catalog.icons';
import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import {
  injectGovernorateLocationsQuery,
  injectProviderSearchQuery,
} from '@features/providers/providers.queries';
import { Button, Icon, IconName, Select, SelectOption } from '@shared/ui';
import { AppMap, MapMarker } from '@shared/ui/map';
import { LocationStore } from '@store/location.store';

/** Uber-like landing: one request box (what + where), a live map of providers, then the how-to. */
@Component({
  selector: 'app-home-page',
  imports: [Select, SelectOption, AppMap, Button, Icon, RouterLink],
  template: `
    <section class="relative overflow-hidden bg-background-inverse">
      <!-- Unsplash photo (free licence), see public/covers/CREDITS.md. -->
      <img
        src="/covers/home-hero.webp"
        alt=""
        aria-hidden="true"
        fetchpriority="high"
        class="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <!-- Dark where the text is (left, and everywhere on a phone), lighter around the map. -->
      <div
        class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(14_22_27/0.88),rgb(14_22_27/0.8))] lg:bg-[linear-gradient(90deg,rgb(14_22_27/0.92)_0%,rgb(14_22_27/0.8)_45%,rgb(14_22_27/0.45)_100%)]"
      ></div>
      <div
        class="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:py-16"
      >
        <div class="flex flex-col justify-center gap-6">
          <span
            class="inline-flex w-fit items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-overline text-primary shadow-card"
          >
            <span class="size-2 rounded-full bg-accent"></span>Entretien auto partout en Tunisie
          </span>
          <h1 class="text-display text-white">
            Votre voiture,<br />entre de bonnes <span class="text-signal-400">mains.</span>
          </h1>
          <p class="max-w-xl text-body-lg text-graphite-200">
            Trouvez un garage ou un service à domicile près de vous, comparez les prix et suivez
            l'entretien de chaque véhicule.
          </p>

          <form
            class="rounded-card border border-border-subtle bg-surface p-4 shadow-card sm:p-5"
            (submit)="find($event)"
          >
            <div class="flex flex-col gap-3">
              <app-select
                aria-label="Service"
                icon="wrench"
                (valueChange)="serviceId.set(toId($event))"
              >
                <app-option value="">Quel service ? Tous les services</app-option>
                @for (service of services.data() ?? []; track service.id) {
                  <app-option [value]="service.id">{{ service.name }}</app-option>
                }
              </app-select>
              <button
                type="button"
                class="ac-field flex items-center gap-3 text-left"
                (click)="location.locate()"
              >
                <svg appIcon name="map-pin" class="size-5 text-primary"></svg>
                <span
                  class="min-w-0 flex-1 truncate"
                  [class.text-foreground-secondary]="!location.label()"
                >
                  @if (location.status() === 'locating') {
                    Localisation en cours…
                  } @else {
                    {{ location.label() ?? 'Où êtes-vous ? Utiliser ma position' }}
                  }
                </span>
                <svg appIcon name="locate" class="size-5 text-foreground-muted"></svg>
              </button>
              @if (location.status() === 'denied' || location.status() === 'unavailable') {
                <app-select aria-label="Gouvernorat" (valueChange)="choosePlace($event)">
                  <app-option value="">Position refusée : choisissez votre gouvernorat</app-option>
                  @for (place of places.data() ?? []; track place.name) {
                    <app-option [value]="place.name">{{ place.name }}</app-option>
                  }
                </app-select>
              }
              <button appButton variant="accent" size="lg" type="submit" class="w-full">
                Voir les pros près de moi
              </button>
            </div>
          </form>

          <ul class="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-graphite-200">
            <li class="flex items-center gap-2">
              <svg appIcon name="shield" class="size-4 text-signal-400"></svg>Prestataires vérifiés
            </li>
            <li class="flex items-center gap-2">
              <svg appIcon name="star" class="size-4 text-signal-400"></svg>Prix affichés
            </li>
            <li class="flex items-center gap-2">
              <svg appIcon name="clock" class="size-4 text-signal-400"></svg>Suivi en direct
            </li>
          </ul>
        </div>

        <div
          class="relative h-[360px] overflow-hidden rounded-card border border-border-subtle bg-surface shadow-card lg:h-auto lg:min-h-[540px]"
        >
          <app-map
            class="absolute inset-0"
            [markers]="markers()"
            [me]="location.position()"
            (markerClick)="openProvider($event)"
          />
          <div
            class="absolute top-4 left-4 z-[400] flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-body-sm font-semibold text-foreground shadow-card"
          >
            <span class="size-2 rounded-full bg-success"></span>{{ total() }} professionnels sur la
            carte
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span class="text-overline text-accent-text">Services</span>
          <h2 class="text-h2 text-primary">De quoi votre voiture a-t-elle besoin ?</h2>
        </div>
        <a routerLink="/providers" class="text-body-sm font-semibold text-primary hover:underline"
          >Tout voir sur la carte</a
        >
      </div>
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        @for (service of services.data() ?? []; track service.id) {
          <a
            routerLink="/providers"
            [queryParams]="{ serviceId: service.id }"
            class="group flex flex-col gap-3 rounded-card border border-border-subtle bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card"
          >
            <span
              class="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <svg appIcon [name]="icon(service.name, service.icon)" class="size-6"></svg>
            </span>
            <span class="text-h4 text-foreground">{{ service.name }}</span>
          </a>
        }
      </div>
    </section>

    <section class="bg-background-subtle">
      <div class="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <span class="text-overline text-accent-text">Comment ça marche</span>
        <h2 class="text-h2 text-primary">Trois étapes, zéro surprise</h2>
        <ol class="mt-8 grid gap-4 md:grid-cols-3">
          @for (step of steps; track step.title; let i = $index) {
            <li class="relative rounded-card border border-border-subtle bg-surface p-6">
              <span class="text-plate text-foreground-muted">0{{ i + 1 }}</span>
              <span
                class="mt-3 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"
                ><svg appIcon [name]="step.icon" class="size-6"></svg
              ></span>
              <h3 class="mt-4 text-h4 text-foreground">{{ step.title }}</h3>
              <p class="mt-1 text-body-sm text-foreground-secondary">{{ step.text }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-2 md:px-8 md:py-16">
      <div class="flex flex-col justify-between gap-6 rounded-2xl bg-primary p-8 text-white">
        <div>
          <img
            src="illustrations/diagnostic.svg"
            alt=""
            class="-mt-2 mb-2 h-32 w-auto rounded-2xl bg-white/95 p-2"
            loading="lazy"
          />
          <h2 class="mt-4 text-h3">Un bruit, un voyant ?</h2>
          <p class="mt-2 text-body text-petrol-100">
            Répondez à quelques questions : nous vous disons la cause probable, l'urgence et le bon
            service.
          </p>
        </div>
        <a appButton variant="accent" routerLink="/diagnostic" class="self-start"
          >Lancer un diagnostic</a
        >
      </div>
      <div
        class="flex flex-col justify-between gap-6 rounded-2xl border border-border-subtle bg-surface p-8"
      >
        <div>
          <img
            src="illustrations/pro-garage.svg"
            alt=""
            class="-mt-2 mb-2 h-32 w-auto"
            loading="lazy"
          />
          <h2 class="mt-4 text-h3 text-primary">Vous êtes garagiste ?</h2>
          <p class="mt-2 text-body text-foreground-secondary">
            Recevez des demandes de clients proches, gérez votre équipe et vos tarifs depuis votre
            espace pro.
          </p>
        </div>
        <a appButton variant="secondary" routerLink="/organizations" class="self-start"
          >Devenir partenaire</a
        >
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly location = inject(LocationStore);
  protected readonly services = injectActiveAutoServicesQuery();
  protected readonly places = injectGovernorateLocationsQuery();
  protected readonly serviceId = signal<number | null>(null);
  private readonly router = inject(Router);
  /** The map shows every visible provider, nearest first once a position is known. */
  private readonly providers = injectProviderSearchQuery(() => ({
    q: '',
    serviceId: null,
    governorate: null,
    atHome: false,
    page: 0,
    size: 100,
    near: this.location.position() ? { ...this.location.position()!, radiusKm: null } : null,
  }));
  protected readonly total = computed(() => this.providers.data()?.page.totalElements ?? 0);
  protected readonly markers = computed<MapMarker[]>(() =>
    (this.providers.data()?.content ?? [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: p.organizationId,
        latitude: p.latitude!,
        longitude: p.longitude!,
        label: p.name,
        approximate: p.approximateLocation,
      })),
  );
  protected readonly steps: { title: string; text: string; icon: IconName }[] = [
    {
      title: 'Décrivez le besoin',
      text: 'Choisissez un service ou lancez un diagnostic guidé.',
      icon: 'diagnostic',
    },
    {
      title: 'Comparez autour de vous',
      text: 'Distance, prix indicatifs, service à domicile : tout sur une carte.',
      icon: 'map',
    },
    {
      title: 'Suivez en direct',
      text: 'Acceptée, en cours, terminée : notifications et rapport dans votre carnet.',
      icon: 'bell',
    },
  ];

  protected icon(name: string, icon: string | null): IconName {
    return serviceIcon(name, icon);
  }

  protected toId(value: string): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  protected choosePlace(name: string): void {
    const place = this.places.data()?.find((p) => p.name === name);
    if (place) this.location.choosePlace(place.name, place.latitude, place.longitude);
  }

  protected find(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/providers'], { queryParams: { serviceId: this.serviceId() } });
  }

  protected openProvider(id: number): void {
    void this.router.navigate(['/providers', id]);
  }
}
