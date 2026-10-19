import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { Icon, IconName } from '@shared/ui';

/** Mobile tab bar (toutestcasa StorefrontBottomNav pattern). */
@Component({
  selector: 'app-client-bottom-nav',
  imports: [Icon, RouterLink, RouterLinkActive],
  template: `
    <nav
      aria-label="Navigation principale"
      class="fixed inset-x-0 bottom-0 z-30 flex h-[calc(64px+env(safe-area-inset-bottom))] items-start border-t border-border-subtle bg-surface pt-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      @for (tab of tabs(); track tab.path) {
        <a
          [routerLink]="tab.path"
          routerLinkActive="!text-primary"
          [routerLinkActiveOptions]="{ exact: tab.exact ?? false }"
          class="flex min-w-0 flex-1 flex-col items-center gap-1 text-foreground-muted"
        >
          <svg appIcon [name]="tab.icon" class="size-6"></svg>
          <span class="text-[11px] font-medium">{{ tab.label }}</span>
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientBottomNav {
  private readonly auth = inject(AuthStore);
  protected readonly tabs = computed<
    { label: string; path: string; icon: IconName; exact?: boolean }[]
  >(() => [
    { label: 'Accueil', path: '/', icon: 'home', exact: true },
    { label: 'Carte', path: '/providers', icon: 'map' },
    { label: 'Diagnostic', path: '/diagnostic', icon: 'diagnostic' },
    { label: 'Demandes', path: '/requests', icon: 'requests' },
    { label: 'Compte', path: this.auth.user() ? '/account' : '/login', icon: 'user' },
  ]);
}
