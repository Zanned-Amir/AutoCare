import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { injectLogoutMutation } from '@features/auth/auth.queries';
import { ADMIN_NAV } from './admin-nav';
import { BackofficeChrome } from './backoffice/backoffice-chrome';
import { BackofficeShell, ShellNavItem } from './backoffice/backoffice-shell';

@Component({
  selector: 'app-admin-layout',
  imports: [BackofficeShell, RouterOutlet],
  providers: [BackofficeChrome],
  template: `
    <app-backoffice-shell
      [items]="items()"
      [bottomItems]="bottomItems()"
      homePath="/admin"
      profilePath="/admin/profile"
      [userName]="auth.user()?.fullName ?? ''"
      [userEmail]="auth.user()?.email ?? ''"
      userRole="Équipe AutoCare"
      (signOut)="signOut()"
    >
      <router-outlet />
    </app-backoffice-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  protected readonly auth = inject(AuthStore);
  private readonly allowed = computed<(ShellNavItem & { bottom?: boolean })[]>(() => {
    this.auth.user();
    return ADMIN_NAV.filter(
      (item) =>
        (!item.permission || this.auth.can(item.permission)) &&
        !(item.hiddenWith && this.auth.can(item.hiddenWith)),
    ).map((item) => ({
      label: item.label,
      path: '/admin/' + item.path,
      icon: item.icon,
      bottom: item.bottom,
    }));
  });
  protected readonly items = computed(() => this.allowed().filter((item) => !item.bottom));
  protected readonly bottomItems = computed(() => this.allowed().filter((item) => item.bottom));
  private readonly logout = injectLogoutMutation();
  private readonly router = inject(Router);

  protected signOut(): void {
    this.logout.mutate(undefined, {
      onSettled: () => void this.router.navigateByUrl('/admin/login'),
    });
  }
}
