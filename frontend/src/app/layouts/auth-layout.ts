import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { Logo } from '@shared/ui';
import { injectRouteData } from './route-data';

const BRAND: Record<string, { label: string; heading: string; description: string }> = {
  login: {
    label: 'Espace client',
    heading: 'Votre voiture,\nentre de bonnes mains.',
    description:
      'Retrouvez vos véhicules, vos demandes en cours et l’historique de chaque entretien.',
  },
  register: {
    label: 'Créer un compte',
    heading: 'Rejoignez\nAutoCare TN.',
    description:
      'Comparez les garages près de chez vous, demandez un service et suivez-le en direct.',
  },
  forgot: {
    label: 'Sécurité',
    heading: 'Récupérez l’accès\nà votre compte.',
    description: 'Un lien ou un code à usage unique, valable quelques minutes.',
  },
  otp: {
    label: 'Vérification',
    heading: 'Sécurité\nrenforcée.',
    description: 'Saisissez le code reçu pour continuer. Ne le partagez avec personne.',
  },
  reset: {
    label: 'Sécurité',
    heading: 'Un nouveau\ndépart.',
    description: 'Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.',
  },
  sent: {
    label: 'Vérification',
    heading: 'Vérifiez\nvos e-mails.',
    description: 'Le lien arrive en quelques secondes. Pensez à regarder dans les indésirables.',
  },
  success: {
    label: 'C’est fait',
    heading: 'Action\nréussie.',
    description: 'Vous pouvez reprendre là où vous en étiez.',
  },
  welcome: {
    label: 'Bienvenue',
    heading: 'Votre voiture,\nentre de bonnes mains.',
    description:
      'Deux minutes pour préparer votre espace : votre véhicule, puis les garages et services qui vous conviennent.',
  },
  staff: {
    label: 'Espace équipe',
    heading: 'Backoffice\nAutoCare TN.',
    description: 'Support, validation des prestataires, catalogue et diagnostic. Session de 12 h.',
  },
};

/** toutestcasa auth shell: dark brand panel from lg, the form in a white card on the subtle background. */
@Component({
  selector: 'app-auth-layout',
  imports: [Logo, RouterLink, RouterOutlet],
  template: `
    <div class="flex min-h-dvh bg-background">
      <aside
        class="relative hidden flex-[0_0_560px] flex-col justify-between overflow-hidden bg-background-inverse p-12 lg:flex xl:flex-[0_0_620px]"
      >
        <img
          [src]="cover()"
          alt=""
          aria-hidden="true"
          fetchpriority="high"
          class="pointer-events-none absolute inset-0 size-full object-cover"
        />
        <!-- Darkens the photo where the white text sits (top logo, bottom copy). -->
        <div
          class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(14_22_27/0.78)_0%,rgb(14_22_27/0.35)_40%,rgb(14_22_27/0.92)_100%)]"
        ></div>
        <div
          class="pointer-events-none absolute -top-48 -right-48 size-[520px] rounded-full bg-primary/35 blur-3xl"
        ></div>
        <a routerLink="/" class="relative w-fit" aria-label="AutoCare TN, accueil"
          ><app-logo theme="white"
        /></a>
        <div class="relative space-y-4">
          <span class="text-overline tracking-widest text-signal-400 uppercase">{{
            brand().label
          }}</span>
          <h1 class="text-h2 whitespace-pre-line text-white">{{ brand().heading }}</h1>
          <p class="max-w-[420px] text-body-sm text-graphite-200">{{ brand().description }}</p>
        </div>
        <p class="relative text-caption text-graphite-400">© {{ year }} AutoCare TN</p>
      </aside>
      <main
        class="flex min-h-dvh flex-1 flex-col items-center overflow-y-auto bg-background-subtle p-4 sm:p-6"
      >
        <div
          [class]="
            (wide() ? 'max-w-[640px] sm:p-8' : 'max-w-[440px] sm:p-10') +
            ' my-auto w-full rounded-2xl bg-surface p-6 shadow-[var(--shadow-raised)]'
          "
        >
          <div class="mb-6 flex justify-center" [class.lg:hidden]="wide()">
            <a
              routerLink="/"
              aria-label="Retour à l'accueil"
              class="flex size-14 items-center justify-center rounded-2xl bg-signal-50 transition-opacity hover:opacity-80 dark:bg-primary-subtle"
            >
              <app-logo variant="icon" size="sm" />
            </a>
          </div>
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  private readonly data = injectRouteData();
  protected readonly year = new Date().getFullYear();
  /** route data `wide`: a 640px card (onboarding) instead of the 440px form card. */
  protected readonly wide = computed(() => this.data()['wide'] === true);
  /** Unsplash photos (free licence), see public/covers/CREDITS.md. */
  protected readonly cover = computed(() =>
    this.data()['brand'] === 'staff' ? '/covers/auth-staff.webp' : '/covers/auth-client.webp',
  );
  protected readonly brand = computed(
    () => BRAND[(this.data()['brand'] as string) ?? 'login'] ?? BRAND['login']!,
  );
}
