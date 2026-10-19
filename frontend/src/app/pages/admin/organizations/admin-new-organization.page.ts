import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { OrganizationForm } from '@features/organizations/components/organization-form';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { Organization } from '@features/organizations/organizations.types';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { Button, Card } from '@shared/ui';

/** Staff opening an organization from the backoffice, for themselves or for an account. */
@Component({
  selector: 'app-admin-new-organization-page',
  imports: [AdminPageHeader, Button, Card, OrganizationForm, RouterLink],
  template: `
    <app-admin-page-header
      title="Nouvelle entreprise"
      subtitle="Ouvrez un garage ou une boutique pour vous-même ou pour un compte existant."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (created(); as organization) {
        <app-card class="flex max-w-2xl flex-col items-start gap-3">
          <h2 class="text-h4">« {{ organization.name }} » est créée</h2>
          <p class="text-body-sm text-foreground-secondary">
            @if (organization.status === 'APPROVED') {
              Elle est validée et apparaît déjà dans la recherche.
            } @else {
              Elle attend la validation d’un administrateur avant d’apparaître dans la recherche.
            }
          </p>
          <div class="flex flex-wrap gap-2">
            @if (canApprove()) {
              <a appButton [routerLink]="['/admin/organizations', organization.id]"
                >Voir la fiche</a
              >
            }
            <a appButton variant="secondary" [routerLink]="['/pro', organization.id]"
              >Ouvrir l’espace pro</a
            >
            <button appButton variant="ghost" type="button" (click)="created.set(null)">
              Créer une autre
            </button>
          </div>
        </app-card>
      } @else {
        <app-card class="max-w-4xl">
          <app-organization-form
            mode="admin"
            [defaultOwnerEmail]="auth.user()?.email ?? ''"
            [canApprove]="canApprove()"
            (saved)="created.set($event)"
            (cancelled)="back()"
          />
        </app-card>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNewOrganizationPage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly created = signal<Organization | null>(null);
  protected readonly canApprove = computed(() =>
    this.auth.can(OrganizationPermissions.ORGANIZATION_APPROVE),
  );

  protected back(): void {
    void this.router.navigate(['/admin']);
  }
}
