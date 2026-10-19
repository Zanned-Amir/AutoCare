import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { injectProviderProfileQuery } from '@features/providers/providers.queries';
import { ServiceRequestForm } from '@features/service-requests/components/service-request-form';
import { ServiceRequest } from '@features/service-requests/service-requests.types';
import { Card, Spinner } from '@shared/ui';

/** /requests/new?organizationId=&serviceId=&diagnosticId= (from a provider profile). */
@Component({
  selector: 'app-new-request-page',
  imports: [Card, RouterLink, ServiceRequestForm, Spinner],
  template: `
    @if (profile.isPending()) {
      <app-spinner />
    } @else if (profile.data(); as provider) {
      <a
        [routerLink]="['/providers', provider.organizationId]"
        class="text-body-sm text-primary hover:underline"
        >← {{ provider.name }}</a
      >
      <h1 class="mt-3 text-h2 text-primary">Demander un service</h1>
      <p class="text-body-sm text-foreground-secondary">
        {{ provider.name }} · {{ provider.city }}, {{ provider.governorate }}
      </p>
      <app-card class="mt-6 max-w-3xl">
        <app-service-request-form
          [organizationId]="provider.organizationId"
          [services]="provider.services"
          [initialServiceId]="toId(serviceId())"
          [diagnosticId]="toId(diagnosticId())"
          (sent)="open($event)"
        />
      </app-card>
    } @else {
      <app-card><p class="text-body-sm">Ce prestataire n'est pas disponible.</p></app-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewRequestPage {
  readonly organizationId = input<string>();
  readonly serviceId = input<string>();
  readonly diagnosticId = input<string>();

  protected readonly profile = injectProviderProfileQuery(() => Number(this.organizationId()));
  private readonly router = inject(Router);

  protected toId(value: string | undefined): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  protected open(request: ServiceRequest): void {
    void this.router.navigate(['/requests', request.id]);
  }
}
