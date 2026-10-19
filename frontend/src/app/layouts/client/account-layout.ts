import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { injectLogoutMutation } from '@features/auth/auth.queries';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { VehiclePermissions } from '@features/vehicles/vehicles.permissions';
import { Icon, IconName } from '@shared/ui';

interface AccountLink {
  label: string;
  shortLabel?: string;
  path: string;
  icon: IconName;
}

/**
 * "Mon compte" frame inside the client layout (toutestcasa AccountLayout pattern): a sticky
 * sidebar card on desktop, a row of pills on phones so the content stays above the fold.
 */
@Component({
  selector: 'app-account-layout',
  imports: [Icon, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <nav
        aria-label="Mon compte"
        class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:px-8 lg:hidden"
      >
        @for (link of links(); track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="!border-primary !bg-primary font-semibold !text-primary-foreground"
            class="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-body-sm whitespace-nowrap text-foreground"
          >
            {{ link.shortLabel ?? link.label }}
          </a>
        }
        <button
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-body-sm whitespace-nowrap text-foreground disabled:opacity-60"
          [disabled]="logout.isPending()"
          (click)="signOut()"
        >
          <svg appIcon name="log-out" class="size-4"></svg>
          {{ logout.isPending() ? 'Déconnexion…' : 'Déconnexion' }}
        </button>
      </nav>

      <aside
        class="sticky top-[calc(var(--site-header)+1.5rem)] hidden w-70 shrink-0 flex-col gap-4 rounded-card border border-border-subtle bg-surface p-4 shadow-card lg:flex"
      >
        <div class="flex items-center gap-3 px-1">
          <span
            class="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-label text-primary-foreground"
            >{{ initials() }}</span
          >
          <div class="min-w-0">
            <p class="truncate text-label text-foreground">
              {{ auth.user()?.fullName ?? 'Mon compte' }}
            </p>
            <p class="truncate text-caption text-foreground-muted">{{ auth.user()?.email }}</p>
          </div>
        </div>

        <nav aria-label="Mon compte" class="flex flex-col gap-1">
          @for (link of links(); track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="!bg-primary font-semibold !text-primary-foreground"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm text-foreground transition-colors hover:bg-background-subtle"
            >
              <svg appIcon [name]="link.icon" class="size-[18px] shrink-0"></svg>
              <span class="min-w-0 flex-1 truncate">{{ link.label }}</span>
            </a>
          }
        </nav>

        <button
          type="button"
          class="flex items-center gap-3 rounded-xl border-t border-border-subtle px-3 pt-4 pb-1 text-body-sm text-error disabled:opacity-60"
          [disabled]="logout.isPending()"
          (click)="signOut()"
        >
          <svg appIcon name="log-out" class="size-[18px]"></svg>
          {{ logout.isPending() ? 'Déconnexion…' : 'Déconnexion' }}
        </button>
      </aside>

      <div class="min-w-0 flex-1">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLayout {
  protected readonly auth = inject(AuthStore);
  protected readonly logout = injectLogoutMutation();
  private readonly router = inject(Router);

  protected readonly initials = computed(() =>
    (this.auth.user()?.fullName ?? '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );

  protected readonly links = computed(() => {
    this.auth.user();
    const links: AccountLink[] = [
      { label: 'Profil et sécurité', shortLabel: 'Profil', path: '/account', icon: 'user' },
    ];
    if (this.auth.can(VehiclePermissions.VEHICLE_READ))
      links.push({
        label: 'Mes véhicules',
        shortLabel: 'Véhicules',
        path: '/vehicles',
        icon: 'car',
      });
    if (this.auth.can(ServiceRequestPermissions.REQUEST_READ))
      links.push({
        label: 'Mes demandes',
        shortLabel: 'Demandes',
        path: '/requests',
        icon: 'requests',
      });
    links.push(
      { label: 'Espace pro', path: '/organizations', icon: 'briefcase' },
      { label: 'Support', path: '/support', icon: 'support' },
    );
    return links;
  });

  protected signOut(): void {
    this.logout.mutate(undefined, { onSettled: () => void this.router.navigateByUrl('/') });
  }
}
