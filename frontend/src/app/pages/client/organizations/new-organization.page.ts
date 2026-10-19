import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { OrganizationApplication } from '@features/organizations/components/organization-application';
import { OrganizationFilesPanel } from '@features/organizations/components/organization-files-panel';
import { Organization } from '@features/organizations/organizations.types';
import { Button, Card, Icon } from '@shared/ui';

/** "Créer mon entreprise": the application in steps, then documents for the review. */
@Component({
  selector: 'app-new-organization-page',
  imports: [Button, Card, Icon, OrganizationApplication, OrganizationFilesPanel, RouterLink],
  template: `
    <a routerLink="/organizations" class="text-body-sm text-primary hover:underline"
      >← Mes entreprises</a
    >
    <span class="mt-3 block text-overline text-accent-text">Espace pro</span>
    <h1 class="text-h2 text-primary">
      {{ sent() ? 'Demande envoyée' : 'Créer mon entreprise' }}
    </h1>

    @if (sent(); as result) {
      <div class="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <app-card class="flex flex-1 flex-col gap-4 md:p-8">
          <span class="grid size-14 place-items-center rounded-full bg-success-subtle text-success"
            ><svg appIcon name="circle-check" class="size-7"></svg
          ></span>
          <div>
            <h2 class="text-h4 text-foreground">
              {{ result.organization.name }} est en cours de validation
            </h2>
            <p class="mt-1 text-body-sm text-foreground-secondary">
              Vous recevrez une notification dès qu’elle est validée. En attendant, votre espace pro
              est déjà ouvert : équipe, services et prix.
            </p>
            @if (result.filesFailed) {
              <p class="mt-2 text-body-sm text-warning">
                {{ result.filesFailed }} fichier(s) n’ont pas pu être envoyés : ajoutez-les
                ci-contre.
              </p>
            }
            @if (result.servicesFailed) {
              <p class="mt-2 text-body-sm text-warning">
                {{ result.servicesFailed }} service(s) n’ont pas pu être ajoutés : ajoutez-les
                depuis votre espace pro.
              </p>
            }
          </div>
          <div class="flex flex-wrap gap-3">
            <a appButton variant="accent" [routerLink]="['/pro', result.organization.id]"
              >Ouvrir mon espace pro</a
            >
            <a appButton variant="secondary" routerLink="/organizations">Mes entreprises</a>
          </div>
        </app-card>
        <div class="w-full lg:w-[420px]">
          <app-organization-files-panel [organizationId]="result.organization.id" />
        </div>
      </div>
    } @else {
      <p class="mt-1 text-body-sm text-foreground-secondary">
        Six étapes, environ trois minutes. Vous en serez le propriétaire.
      </p>
      <div class="mt-6">
        <app-organization-application (submitted)="sent.set($event)" (cancelled)="leave()" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewOrganizationPage {
  private readonly router = inject(Router);
  protected readonly sent = signal<{
    organization: Organization;
    servicesFailed: number;
    filesFailed: number;
  } | null>(null);

  protected leave(): void {
    void this.router.navigateByUrl('/organizations');
  }
}
