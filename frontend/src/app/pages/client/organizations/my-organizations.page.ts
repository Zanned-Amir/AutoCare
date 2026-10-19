import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { OrganizationStatusBadge } from '@features/organizations/components/organization-status-badge';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { injectMyOrganizationsQuery } from '@features/organizations/organizations.queries';
import { memberRoleLabels } from '@features/organizations/organizations.types';
import { Button, Card, EmptyState, Spinner } from '@shared/ui';

@Component({
  selector: 'app-my-organizations-page',
  imports: [Button, Card, EmptyState, OrganizationStatusBadge, RouterLink, Spinner],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span class="text-overline text-accent-text">Espace pro</span>
        <h1 class="text-h2 text-primary">Mes entreprises</h1>
      </div>
      @if (auth.can(permissions.ORGANIZATION_CREATE)) {
        <a appButton routerLink="/organizations/new">Créer mon entreprise</a>
      }
    </div>

    <section class="mt-6">
      @if (organizations.isPending()) {
        <app-spinner />
      } @else if (organizations.isError()) {
        <p class="text-body-sm text-error">Impossible de charger vos entreprises.</p>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2">
          @for (item of organizations.data(); track item.organization.id) {
            <app-card class="flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-h4 text-foreground">{{ item.organization.name }}</h3>
                  <p class="text-body-sm text-foreground-secondary">
                    {{ item.organization.city }}, {{ item.organization.governorate }} ·
                    {{ roleLabels[item.roleKey] }}
                  </p>
                </div>
                <app-organization-status-badge [status]="item.organization.status" />
              </div>
              <div class="mt-auto flex justify-end border-t border-border-subtle pt-3">
                <a
                  appButton
                  variant="secondary"
                  size="sm"
                  [routerLink]="['/pro', item.organization.id]"
                  >Ouvrir l'espace</a
                >
              </div>
            </app-card>
          } @empty {
            <app-card class="sm:col-span-2">
              <app-empty-state
                image="pro-garage"
                title="Vous êtes un professionnel de l'automobile ?"
                description="Garage, vidange à domicile, dépannage : créez votre entreprise, placez-la sur la carte et recevez des demandes de clients proches."
              >
                @if (auth.can(permissions.ORGANIZATION_CREATE)) {
                  <a appButton variant="accent" routerLink="/organizations/new"
                    >Créer mon entreprise</a
                  >
                }
              </app-empty-state>
            </app-card>
          }
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrganizationsPage {
  protected readonly auth = inject(AuthStore);
  protected readonly permissions = OrganizationPermissions;
  protected readonly roleLabels = memberRoleLabels;
  protected readonly organizations = injectMyOrganizationsQuery();
}
