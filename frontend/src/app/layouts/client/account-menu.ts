import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { injectLogoutMutation } from '@features/auth/auth.queries';
import { CatalogPermissions } from '@features/catalog/catalog.permissions';
import { Icon, IconName } from '@shared/ui';
import { UiStore } from '@store/ui.store';

@Component({
  selector: 'app-account-menu',
  imports: [Icon, RouterLink],
  template: `
    <div class="relative">
      <button
        type="button"
        class="flex h-10 items-center gap-2 rounded-full border border-border-subtle bg-surface pr-2.5 pl-1 hover:border-border"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
        (click)="open.set(!open())"
      >
        <span
          class="grid size-8 place-items-center rounded-full bg-primary text-caption font-semibold text-primary-foreground"
          >{{ initials() }}</span
        >
        <span class="hidden max-w-28 truncate text-body-sm font-semibold lg:inline">{{
          firstName()
        }}</span>
        <svg appIcon name="chevron-down" class="size-4 text-foreground-muted"></svg>
      </button>
      @if (open()) {
        <div
          role="menu"
          class="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-card border border-border-subtle bg-surface shadow-card"
        >
          <div class="border-b border-border-subtle px-4 py-3">
            <p class="truncate text-label text-foreground">{{ auth.user()?.fullName }}</p>
            <p class="truncate text-caption text-foreground-muted">{{ auth.user()?.email }}</p>
          </div>
          <ul class="py-1">
            @for (item of items(); track item.path) {
              <li>
                <a
                  role="menuitem"
                  [routerLink]="item.path"
                  (click)="open.set(false)"
                  class="flex items-center gap-3 px-4 py-2 text-body-sm text-foreground hover:bg-surface-muted"
                >
                  <svg appIcon [name]="item.icon" class="size-4 text-foreground-muted"></svg
                  >{{ item.label }}
                </a>
              </li>
            }
          </ul>
          <div class="border-t border-border-subtle py-1">
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-3 px-4 py-2 text-body-sm text-foreground hover:bg-surface-muted"
              (click)="ui.toggleTheme()"
            >
              <svg
                appIcon
                [name]="ui.theme() === 'dark' ? 'sun' : 'moon'"
                class="size-4 text-foreground-muted"
              ></svg>
              {{ ui.theme() === 'dark' ? 'Mode clair' : 'Mode sombre' }}
            </button>
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-3 px-4 py-2 text-body-sm text-error hover:bg-error-subtle"
              (click)="signOut()"
            >
              <svg appIcon name="log-out" class="size-4"></svg>Déconnexion
            </button>
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
export class AccountMenu {
  protected readonly auth = inject(AuthStore);
  protected readonly ui = inject(UiStore);
  protected readonly open = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly logout = injectLogoutMutation();
  private readonly router = inject(Router);

  protected readonly initials = computed(() =>
    (this.auth.user()?.fullName ?? '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
  protected readonly firstName = computed(
    () => (this.auth.user()?.fullName ?? '').split(' ')[0] ?? '',
  );
  protected readonly items = computed(() => {
    this.auth.user();
    const items: { label: string; path: string; icon: IconName }[] = [
      { label: 'Mon compte', path: '/account', icon: 'user' },
      { label: 'Mes véhicules', path: '/vehicles', icon: 'car' },
      { label: 'Mes demandes', path: '/requests', icon: 'requests' },
      { label: 'Espace pro', path: '/organizations', icon: 'briefcase' },
      { label: 'Support', path: '/support', icon: 'support' },
    ];
    if (this.auth.can(CatalogPermissions.SERVICE_READ))
      items.push({ label: 'Backoffice', path: '/admin', icon: 'shield' });
    return items;
  });

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }

  protected signOut(): void {
    this.open.set(false);
    this.logout.mutate(undefined, { onSettled: () => void this.router.navigateByUrl('/') });
  }
}
