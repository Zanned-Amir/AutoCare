import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import { Badge, Button, Card, Spinner } from '@shared/ui';
import { formatMoney } from '@shared/utils/money';
import { ProviderPermissions } from '../providers.permissions';
import { injectProviderServiceMutations, injectProviderServicesQuery } from '../providers.queries';
import { ProviderService } from '../providers.types';
import { ProviderServiceForm } from './provider-service-form';

/** Workspace tab: the services this provider offers, with indicative prices. */
@Component({
  selector: 'app-provider-services-panel',
  imports: [Badge, Button, Card, ProviderServiceForm, Spinner],
  template: `
    <app-card class="p-0">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4"
      >
        <div>
          <h2 class="text-h4 text-foreground">Services proposés</h2>
          <p class="text-body-sm text-foreground-secondary">
            Ce que les clients voient dans la recherche.
          </p>
        </div>
        @if (canManage() && editing() === null && availableServices().length > 0) {
          <button
            appButton
            variant="secondary"
            size="sm"
            type="button"
            (click)="editing.set('new')"
          >
            Ajouter un service
          </button>
        }
      </div>

      @if (editing() === 'new') {
        <div class="border-b border-border-subtle bg-background-subtle p-4">
          <app-provider-service-form
            [organizationId]="organizationId()"
            [availableServices]="availableServices()"
            (saved)="editing.set(null)"
            (cancelled)="editing.set(null)"
          />
        </div>
      }

      @if (actionError(); as message) {
        <p class="mx-4 mt-4 rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }

      @if (offer.isPending()) {
        <div class="p-6"><app-spinner /></div>
      } @else if (offer.isError()) {
        <p class="p-4 text-body-sm text-error">Impossible de charger vos services.</p>
      } @else {
        <ul class="divide-y divide-border-subtle">
          @for (service of offer.data(); track service.id) {
            <li class="px-4 py-3">
              @if (editingId() === service.id) {
                <app-provider-service-form
                  [organizationId]="organizationId()"
                  [service]="service"
                  (saved)="editing.set(null)"
                  (cancelled)="editing.set(null)"
                />
              } @else {
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-label text-foreground">{{ service.serviceName }}</span>
                    @if (service.atHome) {
                      <app-badge tone="info">À domicile</app-badge>
                    }
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-price text-primary">{{
                      service.indicativePrice ? formatMoney(service.indicativePrice) : 'Sur devis'
                    }}</span>
                    @if (canManage()) {
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="editing.set(service)"
                      >
                        Modifier
                      </button>
                      @if (confirmRemoveId() === service.id) {
                        <button
                          appButton
                          variant="danger"
                          size="sm"
                          type="button"
                          (click)="remove(service)"
                        >
                          Confirmer
                        </button>
                        <button
                          appButton
                          variant="ghost"
                          size="sm"
                          type="button"
                          (click)="confirmRemoveId.set(null)"
                        >
                          Annuler
                        </button>
                      } @else {
                        <button
                          appButton
                          variant="ghost"
                          size="sm"
                          type="button"
                          (click)="confirmRemoveId.set(service.id)"
                        >
                          Retirer
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            </li>
          } @empty {
            <li class="px-4 py-6 text-body-sm text-foreground-muted">
              Aucun service pour l'instant. Ajoutez ce que vous proposez pour apparaître dans la
              recherche.
            </li>
          }
        </ul>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderServicesPanel {
  readonly organizationId = input.required<number>();

  protected readonly auth = inject(AuthStore);
  protected readonly formatMoney = formatMoney;
  protected readonly canManage = computed(() =>
    this.auth.canInOrganization(ProviderPermissions.SERVICE_MANAGE),
  );
  protected readonly offer = injectProviderServicesQuery(
    () => this.organizationId(),
    () => this.auth.canInOrganization(ProviderPermissions.SERVICE_READ),
  );
  private readonly catalog = injectActiveAutoServicesQuery();
  private readonly mutations = injectProviderServiceMutations(() => this.organizationId());

  protected readonly availableServices = computed(() => {
    const offered = new Set((this.offer.data() ?? []).map((service) => service.serviceId));
    return (this.catalog.data() ?? []).filter((service) => !offered.has(service.id));
  });

  protected readonly editing = signal<ProviderService | 'new' | null>(null);
  protected readonly editingId = computed(() => {
    const current = this.editing();
    return current !== null && current !== 'new' ? current.id : null;
  });
  protected readonly confirmRemoveId = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected remove(service: ProviderService): void {
    this.confirmRemoveId.set(null);
    this.actionError.set(null);
    this.mutations.remove.mutate(service.id, {
      onError: (error) => this.actionError.set(problemMessage(error, 'Suppression impossible')),
    });
  }
}
