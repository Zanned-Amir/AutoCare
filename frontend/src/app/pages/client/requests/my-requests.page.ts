import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RequestStatusBadge } from '@features/service-requests/components/request-status-badge';
import { injectMyRequestsQuery } from '@features/service-requests/service-requests.queries';
import { RequestStatus, locationLabels } from '@features/service-requests/service-requests.types';
import { Button, Card, EmptyState, Spinner } from '@shared/ui';
import { cn } from '@shared/utils/cn';

const FILTERS: { status: RequestStatus | null; label: string }[] = [
  { status: null, label: 'Toutes' },
  { status: 'PENDING', label: 'En attente' },
  { status: 'CONFIRMED', label: 'Acceptées' },
  { status: 'IN_PROGRESS', label: 'En cours' },
  { status: 'COMPLETED', label: 'Terminées' },
];
const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

@Component({
  selector: 'app-my-requests-page',
  imports: [Button, Card, EmptyState, RequestStatusBadge, RouterLink, Spinner],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span class="text-overline text-accent-text">Suivi</span>
        <h1 class="text-h2 text-primary">Mes demandes</h1>
      </div>
      <a appButton variant="accent" routerLink="/providers">Nouvelle demande</a>
    </div>
    <div class="mt-6 flex flex-wrap gap-2" role="tablist">
      @for (filter of filters; track filter.label) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="status() === filter.status"
          [class]="tabClass(filter.status)"
          (click)="status.set(filter.status); page.set(0)"
        >
          {{ filter.label }}
        </button>
      }
    </div>
    @if (requests.isPending()) {
      <div class="mt-6"><app-spinner /></div>
    } @else if (requests.data(); as result) {
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        @for (request of result.content; track request.id) {
          <a [routerLink]="['/requests', request.id]" class="block">
            <app-card class="flex h-full flex-col gap-1 transition hover:border-primary">
              <div class="flex items-start justify-between gap-2">
                <p class="text-h4 text-foreground">{{ request.service.name }}</p>
                <app-request-status-badge [status]="request.status" />
              </div>
              <p class="text-body-sm text-foreground-secondary">
                {{ request.organization?.name }} · {{ request.organization?.city }}
              </p>
              <p class="text-caption text-foreground-muted">
                {{ format(request.desiredDate) }} · {{ locationLabels[request.locationType] }}
                @if (request.vehicle; as vehicle) {
                  · {{ vehicle.brand }} {{ vehicle.model }}
                }
              </p>
            </app-card>
          </a>
        } @empty {
          <app-card class="md:col-span-2">
            <app-empty-state
              image="empty-requests"
              title="Aucune demande"
              description="Trouvez un professionnel près de chez vous et demandez un service en quelques clics."
            >
              <a appButton variant="accent" routerLink="/providers">Trouver un pro</a>
              <a appButton variant="secondary" routerLink="/diagnostic">Lancer un diagnostic</a>
            </app-empty-state>
          </app-card>
        }
      </div>
      @if (result.page.totalPages > 1) {
        <div class="mt-4 flex justify-end gap-2">
          <button
            appButton
            variant="secondary"
            size="sm"
            type="button"
            [disabled]="page() === 0"
            (click)="page.set(page() - 1)"
          >
            Précédent
          </button>
          <button
            appButton
            variant="secondary"
            size="sm"
            type="button"
            [disabled]="page() + 1 >= result.page.totalPages"
            (click)="page.set(page() + 1)"
          >
            Suivant
          </button>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyRequestsPage {
  protected readonly filters = FILTERS;
  protected readonly locationLabels = locationLabels;
  protected readonly status = signal<RequestStatus | null>(null);
  protected readonly page = signal(0);
  protected readonly requests = injectMyRequestsQuery(
    () => this.status(),
    () => this.page(),
  );

  protected format(value: string): string {
    return dateFormat.format(new Date(value + 'T00:00:00'));
  }

  protected tabClass(status: RequestStatus | null): string {
    return cn(
      'rounded-full border px-3 py-1 text-body-sm',
      this.status() === status
        ? 'border-primary bg-primary-subtle text-primary'
        : 'border-border-subtle text-foreground-secondary hover:text-foreground',
    );
  }
}
