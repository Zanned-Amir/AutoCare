import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { AutoService } from '@features/catalog/catalog.types';
import { Button, FormField, inputClasses, Select, SelectOption } from '@shared/ui';
import { injectProviderServiceMutations } from '../providers.queries';
import { ProviderServiceFormValue, providerServiceFormSchema } from '../providers.schema';
import { ProviderService } from '../providers.types';

const toFormValue = (service: ProviderService | null): ProviderServiceFormValue => ({
  serviceId: service ? String(service.serviceId) : '',
  atHome: service?.atHome ?? false,
  indicativePrice: service?.indicativePrice ?? '',
});

/** Add a service to the offer, or edit price / at-home of an offered one. */
@Component({
  selector: 'app-provider-service-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form
      class="grid gap-3 sm:grid-cols-[1fr_160px] sm:items-end"
      (submit)="save($event)"
      novalidate
    >
      @if (service(); as current) {
        <p class="text-label text-foreground sm:col-span-2">{{ current.serviceName }}</p>
      } @else {
        <app-form-field label="Service" controlId="offer-service" [field]="offerForm.serviceId">
          <app-select id="offer-service" [formField]="offerForm.serviceId">
            <app-option value="" disabled>Choisir un service…</app-option>
            @for (option of availableServices(); track option.id) {
              <app-option [value]="option.id">{{ option.name }}</app-option>
            }
          </app-select>
        </app-form-field>
      }
      <app-form-field
        label="Prix indicatif (DT)"
        controlId="offer-price"
        [field]="offerForm.indicativePrice"
      >
        <input
          id="offer-price"
          inputmode="decimal"
          placeholder="Sur devis"
          [class]="inputClasses"
          [formField]="offerForm.indicativePrice"
        />
      </app-form-field>
      <label class="flex items-center gap-2 text-body-sm sm:col-span-2">
        <input type="checkbox" class="size-4 accent-primary" [formField]="offerForm.atHome" />
        Disponible à domicile
      </label>

      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2">
          {{ message }}
        </p>
      }

      <div class="flex justify-end gap-2 sm:col-span-2">
        <button appButton variant="ghost" size="sm" type="button" (click)="cancelled.emit()">
          Annuler
        </button>
        <button appButton size="sm" type="submit" [disabled]="!canSubmit()">
          {{ service() ? 'Enregistrer' : 'Ajouter' }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderServiceForm {
  readonly organizationId = input.required<number>();
  readonly service = input<ProviderService | null>(null);
  /** Catalog services not offered yet (only used when adding). */
  readonly availableServices = input<AutoService[]>([]);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<ProviderServiceFormValue>(toFormValue(null));
  protected readonly offerForm = form(this.model, (path) =>
    validateStandardSchema(path, providerServiceFormSchema),
  );
  protected readonly serverError = signal<string | null>(null);

  private readonly mutations = injectProviderServiceMutations(() => this.organizationId());

  protected readonly canSubmit = computed(
    () => this.offerForm().dirty() && this.offerForm().valid() && !this.mutations.save.isPending(),
  );

  constructor() {
    effect(() => {
      this.offerForm().reset(toFormValue(this.service()));
      this.serverError.set(null);
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.offerForm, async () => {
      this.serverError.set(null);
      try {
        const saved = await this.mutations.save.mutateAsync({
          id: this.service()?.id ?? null,
          value: providerServiceFormSchema.parse(this.model()),
        });
        this.offerForm().reset(toFormValue(saved));
        this.saved.emit();
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
