import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { injectLogoutMutation } from '@features/auth/auth.queries';
import { MaintenancePermissions } from '@features/maintenance/maintenance.types';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { memberRoleLabels } from '@features/organizations/organizations.types';
import { ProviderPermissions } from '@features/providers/providers.permissions';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { Button, Card, Spinner } from '@shared/ui';
import { BackofficeChrome } from './backoffice/backoffice-chrome';
import { BackofficeShell, ShellNavItem } from './backoffice/backoffice-shell';
import { ProContext } from './pro/pro-context';

/** Professional backoffice: one organization at a time, menu filtered by the member's role. */
@Component({
  selector: 'app-pro-layout',
  imports: [BackofficeShell, Button, Card, RouterLink, RouterOutlet, Spinner],
  providers: [BackofficeChrome, ProContext],
  template: `
    @if (context.organizations.isPending()) {
      <div class="grid h-dvh place-items-center bg-background-subtle"><app-spinner /></div>
    } @else if (context.membership(); as current) {
      <app-backoffice-shell
        [items]="items()"
        [homePath]="base()"
        [contextLabel]="current.organization.name"
        [contextSub]="roleLabels[current.roleKey]"
        [switchOptions]="switchOptions()"
        [switchValue]="current.organization.id"
        [userName]="auth.user()?.fullName ?? ''"
        [userEmail]="auth.user()?.email ?? ''"
        searchPlaceholder="Rechercher dans l’espace pro…"
        userRole="Espace professionnel"
        (switched)="switchTo($event)"
        (signOut)="signOut()"
      >
        @if (current.organization.status !== 'APPROVED') {
          <div
            shellBanner
            [class]="
              current.organization.status === 'PENDING'
                ? 'bg-warning-subtle px-4 py-2 text-center text-body-sm text-warning'
                : 'bg-error-subtle px-4 py-2 text-center text-body-sm text-error'
            "
          >
            {{
              current.organization.status === 'PENDING'
                ? 'En cours de validation : préparez vos services, votre emplacement et vos documents.'
                : 'Entreprise suspendue : elle n’apparaît plus dans la recherche. Contactez le support.'
            }}
          </div>
        }
        <router-outlet />
      </app-backoffice-shell>
    } @else {
      <div class="grid min-h-dvh place-items-center bg-background-subtle px-4">
        <app-card class="max-w-md text-center">
          <h1 class="text-h4">Espace introuvable</h1>
          <p class="mt-1 text-body-sm text-foreground-secondary">
            Vous ne faites pas partie de cette entreprise.
          </p>
          <a appButton class="mt-4" routerLink="/organizations">Mes entreprises</a>
        </app-card>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProLayout {
  /** Route param, bound by withComponentInputBinding(). */
  readonly organizationId = input.required<string>();

  protected readonly context = inject(ProContext);
  protected readonly auth = inject(AuthStore);
  protected readonly roleLabels = memberRoleLabels;
  protected readonly base = computed(() => '/pro/' + this.organizationId());
  protected readonly switchOptions = computed(() =>
    (this.context.organizations.data() ?? []).map((item) => ({
      id: item.organization.id,
      label: item.organization.name,
    })),
  );
  protected readonly items = computed<ShellNavItem[]>(() => {
    this.context.membership();
    this.auth.organizationPermissions();
    const base = this.base();
    const can = (permission: string) => this.auth.canInOrganization(permission);
    const items: ShellNavItem[] = [
      { label: 'Tableau de bord', path: base, icon: 'dashboard', exact: true },
    ];
    if (can(ServiceRequestPermissions.REQUEST_READ))
      items.push(
        { label: 'Agenda', path: base + '/calendar', icon: 'calendar' },
        { label: 'Demandes', path: base + '/requests', icon: 'requests' },
      );
    if (can(ProviderPermissions.SERVICE_READ))
      items.push({ label: 'Services et tarifs', path: base + '/services', icon: 'wrench' });
    if (can(MaintenancePermissions.HISTORY_READ))
      items.push({ label: 'Interventions', path: base + '/history', icon: 'history' });
    items.push({ label: 'Avis clients', path: base + '/reviews', icon: 'star' });
    items.push({ label: 'Profil et carte', path: base + '/profile', icon: 'map-pin' });
    if (can(OrganizationPermissions.MEMBER_READ))
      items.push({ label: 'Équipe', path: base + '/team', icon: 'users' });
    return items;
  });
  private readonly router = inject(Router);
  private readonly logout = injectLogoutMutation();

  constructor() {
    effect(() => this.context.organizationId.set(Number(this.organizationId())));
  }

  protected switchTo(id: number): void {
    void this.router.navigate(['/pro', id]);
  }

  protected signOut(): void {
    this.logout.mutate(undefined, { onSettled: () => void this.router.navigateByUrl('/') });
  }
}
