import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { safeRedirect } from '@core/auth/permission.guard';
import { injectFinishOnboardingMutation } from '@features/account/account.queries';
import { VehicleForm } from '@features/vehicles/components/vehicle-form';
import { Vehicle } from '@features/vehicles/vehicles.types';
import { Button, Icon, IconName } from '@shared/ui';
import { cn } from '@shared/utils/cn';

type Profile = 'client' | 'pro';
type Step = 'profile' | 'vehicle' | 'done';

const PROFILES: { value: Profile; icon: IconName; title: string; text: string }[] = [
  {
    value: 'client',
    icon: 'car',
    title: 'Entretenir mon véhicule',
    text: 'Diagnostic guidé, garages proches, suivi de chaque intervention.',
  },
  {
    value: 'pro',
    icon: 'wrench',
    title: 'Je suis un professionnel',
    text: 'Garage, vidange à domicile, dépannage : recevez des demandes de clients.',
  },
];

/**
 * Welcome flow after sign-up (toutestcasa onboarding): one route, the step is wizard state.
 * Steps follow the answers: the vehicle step only for someone who drives, the pro hint only
 * for a professional. "Passer" ends it as skipped; either way it is never offered again.
 */
@Component({
  selector: 'app-onboarding-page',
  imports: [Button, Icon, VehicleForm],
  template: `
    <div class="mb-6 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="text-caption text-foreground-muted"
          >Étape {{ index() + 1 }} sur {{ steps().length }}</span
        >
        <span class="flex items-center gap-1" aria-hidden="true">
          @for (key of steps(); track key; let i = $index) {
            <span
              class="size-1.5 rounded-full transition-colors"
              [class.bg-accent]="i <= index()"
              [class.bg-border]="i > index()"
            ></span>
          }
        </span>
      </div>
      @if (current() !== 'done') {
        <button
          type="button"
          class="text-caption text-foreground-muted transition-colors hover:text-foreground disabled:opacity-60"
          [disabled]="finish.isPending()"
          (click)="end(true)"
        >
          Passer
        </button>
      }
    </div>

    @switch (current()) {
      @case ('profile') {
        <h1 class="text-h3 text-foreground">
          Bienvenue{{ firstName() ? ' ' + firstName() : '' }} !
        </h1>
        <p class="mt-2 text-body-sm text-foreground-secondary">
          Comment allez-vous utiliser AutoCare ? Choisissez une ou deux réponses.
        </p>
        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          @for (option of profiles; track option.value) {
            <button
              type="button"
              [attr.aria-pressed]="isChosen(option.value)"
              [class]="profileClass(option.value)"
              (click)="toggle(option.value)"
            >
              <span class="flex items-center justify-between">
                <span
                  class="grid size-11 place-items-center rounded-xl bg-primary-subtle text-primary"
                  ><svg appIcon [name]="option.icon" class="size-5"></svg
                ></span>
                @if (isChosen(option.value)) {
                  <span
                    class="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground"
                    ><svg appIcon name="check" class="size-3.5"></svg
                  ></span>
                }
              </span>
              <span class="mt-3 block text-label text-foreground">{{ option.title }}</span>
              <span class="mt-1 block text-body-sm text-foreground-secondary">{{
                option.text
              }}</span>
            </button>
          }
        </div>
      }
      @case ('vehicle') {
        <h1 class="text-h3 text-foreground">Votre véhicule</h1>
        <p class="mt-2 text-body-sm text-foreground-secondary">
          Le diagnostic et les garages s’adaptent à votre modèle et à son kilométrage. Vous pourrez
          en ajouter d’autres plus tard.
        </p>
        <div class="mt-6">
          @if (vehicle(); as saved) {
            <div class="flex items-center gap-3 rounded-2xl bg-success-subtle px-4 py-3">
              <svg appIcon name="circle-check" class="size-5 text-success"></svg>
              <p class="text-body-sm text-foreground">
                {{ saved.brand }} {{ saved.model }} ({{ saved.year }}) est enregistré.
              </p>
            </div>
          } @else {
            <app-vehicle-form (saved)="vehicleSaved($event)" (cancelled)="next()" />
          }
        </div>
      }
      @case ('done') {
        <div class="flex flex-col items-center gap-4 py-6 text-center">
          <span class="grid size-14 place-items-center rounded-full bg-signal-50 text-accent-text"
            ><svg appIcon name="circle-check" class="size-7"></svg
          ></span>
          <div>
            <h1 class="text-h3 text-foreground">Tout est prêt !</h1>
            <p class="mt-2 text-body-sm text-foreground-secondary">
              @if (chosen().includes('pro')) {
                Créez votre entreprise : notre équipe la valide, puis elle apparaît dans la
                recherche.
              } @else {
                Lancez un diagnostic ou trouvez un garage près de chez vous.
              }
            </p>
          </div>
        </div>
      }
    }

    @if (error(); as message) {
      <p
        class="mt-6 rounded-2xl border border-error bg-error-subtle px-4 py-3 text-body-sm text-error"
      >
        {{ message }}
      </p>
    }

    <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
      @if (index() > 0 && current() !== 'done') {
        <button
          type="button"
          class="flex items-center gap-1.5 text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
          (click)="back()"
        >
          <svg appIcon name="arrow-left" class="size-4"></svg>Retour
        </button>
      } @else {
        <span></span>
      }
      <div class="flex flex-wrap items-center justify-end gap-3">
        @switch (current()) {
          @case ('profile') {
            <button appButton type="button" [disabled]="!chosen().length" (click)="next()">
              Continuer
            </button>
          }
          @case ('vehicle') {
            @if (vehicle()) {
              <button appButton type="button" (click)="next()">Continuer</button>
            }
          }
          @case ('done') {
            @if (chosen().includes('pro')) {
              <button
                appButton
                variant="accent"
                type="button"
                [disabled]="finish.isPending()"
                (click)="end(false, '/organizations/new')"
              >
                Créer mon entreprise
              </button>
            }
            @if (chosen().includes('client')) {
              <button
                appButton
                [variant]="chosen().includes('pro') ? 'secondary' : 'accent'"
                type="button"
                [disabled]="finish.isPending()"
                (click)="end(false, '/diagnostic')"
              >
                Lancer un diagnostic
              </button>
              <button
                appButton
                variant="secondary"
                type="button"
                [disabled]="finish.isPending()"
                (click)="end(false, '/providers')"
              >
                Trouver un garage
              </button>
            }
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  /** ?redirect= from the sign-in page, bound by withComponentInputBinding(). */
  readonly redirect = input<string>();

  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly finish = injectFinishOnboardingMutation();
  protected readonly profiles = PROFILES;

  protected readonly chosen = signal<Profile[]>([]);
  protected readonly vehicle = signal<Vehicle | null>(null);
  protected readonly index = signal(0);
  protected readonly error = signal<string | null>(null);

  protected readonly steps = computed<Step[]>(() =>
    this.chosen().includes('client') ? ['profile', 'vehicle', 'done'] : ['profile', 'done'],
  );
  protected readonly current = computed(
    () => this.steps()[Math.min(this.index(), this.steps().length - 1)]!,
  );
  protected readonly firstName = computed(() => (this.auth.user()?.fullName ?? '').split(' ')[0]);

  protected isChosen(profile: Profile): boolean {
    return this.chosen().includes(profile);
  }

  protected toggle(profile: Profile): void {
    this.chosen.update((list) =>
      list.includes(profile) ? list.filter((p) => p !== profile) : [...list, profile],
    );
  }

  protected profileClass(profile: Profile): string {
    return cn(
      'flex flex-col rounded-2xl border-2 p-4 text-left transition-colors',
      this.isChosen(profile)
        ? 'border-accent bg-surface'
        : 'border-border-subtle hover:border-border-strong',
    );
  }

  protected vehicleSaved(vehicle: Vehicle): void {
    this.vehicle.set(vehicle);
    this.next();
  }

  protected next(): void {
    this.index.update((i) => Math.min(i + 1, this.steps().length - 1));
  }

  protected back(): void {
    this.index.update((i) => Math.max(i - 1, 0));
  }

  /** Recorded first, so the flow never comes back, then on to the chosen page or ?redirect=. */
  protected end(skipped: boolean, target?: string): void {
    this.error.set(null);
    this.finish.mutate(skipped, {
      onSuccess: () =>
        void this.router.navigateByUrl(target ?? safeRedirect(this.redirect(), '/vehicles')),
      onError: (error) =>
        this.error.set(problemMessage(error, 'Impossible d’enregistrer, réessayez.')),
    });
  }
}
