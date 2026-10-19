import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { AuthStore } from '@core/auth/auth.store';
import { injectLogoutMutation } from '@features/auth/auth.queries';
import { NotificationBell } from '@features/notifications/components/notification-bell';
import { Button, Icon, IconName, Logo } from '@shared/ui';
import { LocationStore } from '@store/location.store';
import { UiStore } from '@store/ui.store';
import { AccountMenu } from './account-menu';

interface NavLink {
  label: string;
  path: string;
  icon: IconName;
  exact?: boolean;
}

/** Storefront header (toutestcasa pattern): logo, search pill, actions, then a nav row on desktop. */
@Component({
  selector: 'app-site-header',
  imports: [AccountMenu, Button, Icon, Logo, NotificationBell, RouterLink, RouterLinkActive],
  template: `
    <header
      class="sticky top-0 z-30 border-b border-border-subtle bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      <div class="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 md:h-[80px] md:gap-8 md:px-8">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-control text-primary hover:bg-primary-subtle md:hidden"
          [attr.aria-expanded]="menuOpen()"
          [attr.aria-label]="menuOpen() ? 'Fermer le menu' : 'Ouvrir le menu'"
          (click)="menuOpen.set(!menuOpen())"
        >
          <svg appIcon [name]="menuOpen() ? 'x' : 'menu'" class="size-5"></svg>
        </button>
        <a routerLink="/" class="shrink-0 rounded-control" aria-label="AutoCare TN, accueil"
          ><app-logo
        /></a>

        <form role="search" class="hidden min-w-0 flex-1 md:block" (submit)="search($event)">
          <div class="relative max-w-xl">
            <svg
              appIcon
              name="search"
              class="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-foreground-muted"
            ></svg>
            <input
              aria-label="Rechercher un service, un garage ou une ville"
              placeholder="Vidange, freinage, garage, ville…"
              [value]="q()"
              (input)="q.set($any($event.target).value)"
              class="h-[46px] w-full rounded-full border border-border bg-background-subtle pr-40 pl-12 text-body text-foreground placeholder:text-foreground-secondary focus:border-accent focus:bg-surface focus:outline-none"
            />
            <button
              type="button"
              (click)="nearMe()"
              class="absolute top-1/2 right-1.5 flex h-8 max-w-36 -translate-y-1/2 items-center gap-1.5 rounded-full bg-surface px-3 text-body-sm font-semibold text-primary shadow-card hover:bg-primary-subtle"
            >
              <svg appIcon name="locate" class="size-4"></svg>
              <span class="truncate">{{ location.label() ?? 'Près de moi' }}</span>
            </button>
          </div>
        </form>

        <div class="ml-auto flex items-center gap-1 md:gap-2">
          <a
            routerLink="/providers"
            class="grid size-10 place-items-center rounded-control text-foreground hover:bg-surface-muted md:hidden"
            aria-label="Rechercher"
          >
            <svg appIcon name="search" class="size-5"></svg>
          </a>
          @if (auth.user()) {
            <a
              appButton
              variant="ghost"
              size="sm"
              routerLink="/organizations"
              class="max-lg:hidden"
            >
              <svg appIcon name="briefcase" class="mr-1.5 size-4"></svg>Espace pro
            </a>
            <app-notification-bell />
            <app-account-menu class="hidden md:block" />
          } @else {
            <button
              type="button"
              class="hidden size-10 place-items-center rounded-control text-foreground-secondary hover:bg-surface-muted sm:grid"
              [attr.aria-label]="ui.theme() === 'dark' ? 'Mode clair' : 'Mode sombre'"
              (click)="ui.toggleTheme()"
            >
              <svg appIcon [name]="ui.theme() === 'dark' ? 'sun' : 'moon'" class="size-5"></svg>
            </button>
            <a appButton variant="ghost" size="sm" routerLink="/login">Connexion</a>
            <a appButton variant="accent" size="sm" routerLink="/register" class="max-sm:hidden"
              >Créer un compte</a
            >
          }
        </div>
      </div>

      <nav class="hidden border-t border-border-subtle md:block" aria-label="Navigation principale">
        <div class="mx-auto flex h-14 max-w-7xl items-center gap-2 px-8">
          @for (link of links(); track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="!text-primary after:!scale-x-100"
              [routerLinkActiveOptions]="{ exact: link.exact ?? false }"
              class="relative flex h-14 shrink-0 items-center gap-2 px-3 font-heading whitespace-nowrap text-[15px] font-semibold text-foreground-secondary transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:scale-x-0 after:rounded-t-full after:bg-accent after:transition-transform hover:text-primary"
            >
              <svg appIcon [name]="link.icon" class="size-4"></svg>{{ link.label }}
            </a>
          }
          <span
            class="ml-auto hidden shrink-0 items-center gap-1.5 text-caption whitespace-nowrap text-foreground-muted xl:flex"
          >
            <svg appIcon name="map-pin" class="size-3.5"></svg>Partout en Tunisie, 24 gouvernorats
          </span>
        </div>
      </nav>

      @if (menuOpen()) {
        <div class="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-surface p-4 md:hidden">
          <ul class="flex flex-col">
            @for (link of links(); track link.path) {
              <li>
                <a
                  [routerLink]="link.path"
                  class="flex items-center gap-3 rounded-control px-3 py-3 text-body text-foreground hover:bg-surface-muted"
                >
                  <svg appIcon [name]="link.icon" class="size-5 text-primary"></svg>{{ link.label }}
                </a>
              </li>
            }
            @if (auth.user()) {
              <li>
                <a
                  routerLink="/organizations"
                  class="flex items-center gap-3 rounded-control px-3 py-3 text-body hover:bg-surface-muted"
                  ><svg appIcon name="briefcase" class="size-5 text-primary"></svg>Espace pro</a
                >
              </li>
              <li>
                <a
                  routerLink="/account"
                  class="flex items-center gap-3 rounded-control px-3 py-3 text-body hover:bg-surface-muted"
                  ><svg appIcon name="user" class="size-5 text-primary"></svg>Mon compte</a
                >
              </li>
            }
          </ul>
          <div class="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-4">
            <button appButton variant="secondary" type="button" (click)="ui.toggleTheme()">
              <svg appIcon [name]="ui.theme() === 'dark' ? 'sun' : 'moon'" class="mr-2 size-4"></svg
              >{{ ui.theme() === 'dark' ? 'Mode clair' : 'Mode sombre' }}
            </button>
            @if (auth.user()) {
              <button appButton variant="ghost" type="button" (click)="signOut()">
                Déconnexion
              </button>
            } @else {
              <a appButton variant="accent" routerLink="/register">Créer un compte</a>
              <a appButton variant="secondary" routerLink="/login">Connexion</a>
            }
          </div>
        </div>
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  protected readonly auth = inject(AuthStore);
  protected readonly ui = inject(UiStore);
  protected readonly location = inject(LocationStore);
  protected readonly menuOpen = signal(false);
  protected readonly q = signal('');
  private readonly router = inject(Router);
  private readonly logout = injectLogoutMutation();

  protected readonly links = computed<NavLink[]>(() => {
    const links: NavLink[] = [
      { label: 'Trouver un pro', path: '/providers', icon: 'map' },
      { label: 'Diagnostic', path: '/diagnostic', icon: 'diagnostic' },
    ];
    if (this.auth.user()) {
      links.push(
        { label: 'Mes véhicules', path: '/vehicles', icon: 'car' },
        { label: 'Mes demandes', path: '/requests', icon: 'requests' },
        { label: 'Support', path: '/support', icon: 'support' },
      );
    }
    return links;
  });

  constructor() {
    const subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  protected search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/providers'], { queryParams: { q: this.q().trim() || null } });
  }

  protected nearMe(): void {
    if (!this.location.position()) this.location.locate();
    void this.router.navigate(['/providers']);
  }

  protected signOut(): void {
    this.logout.mutate(undefined, { onSettled: () => void this.router.navigateByUrl('/') });
  }
}
