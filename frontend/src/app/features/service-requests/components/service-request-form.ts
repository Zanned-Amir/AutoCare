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
import { ProviderService } from '@features/providers/providers.types';
import { injectMyVehiclesQuery } from '@features/vehicles/vehicles.queries';
import { Button, FormField, inputClasses, Select, SelectOption } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { formatMoney } from '@shared/utils/money';
import { injectCreateRequestMutation, injectSlotsQuery } from '../service-requests.queries';
import { ServiceRequestValue, serviceRequestSchema } from '../service-requests.schema';
import { ServiceRequest } from '../service-requests.types';

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

@Component({
  selector: 'app-service-request-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
      <app-form-field label="Service" controlId="request-service" [field]="requestForm.serviceId">
        <app-select id="request-service" [formField]="requestForm.serviceId">
          <app-option value="">Choisir…</app-option>
          @for (service of services(); track service.id) {
            <app-option [value]="'' + service.serviceId">
              {{ service.serviceName }} —
              {{ service.indicativePrice ? formatMoney(service.indicativePrice) : 'sur devis' }}
            </app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field label="Véhicule" controlId="request-vehicle" [field]="requestForm.vehicleId">
        <app-select id="request-vehicle" [formField]="requestForm.vehicleId">
          <app-option value="">Choisir…</app-option>
          @for (vehicle of vehicles.data() ?? []; track vehicle.id) {
            <app-option [value]="'' + vehicle.id">
              {{ vehicle.brand }} {{ vehicle.model }} ({{ vehicle.year }})
            </app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field
        label="Où ?"
        controlId="request-location-type"
        [field]="requestForm.locationType"
      >
        <app-select id="request-location-type" [formField]="requestForm.locationType">
          <app-option value="AT_PROVIDER">Chez le prestataire</app-option>
          @if (selectedService()?.atHome) {
            <app-option value="HOME">À domicile</app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field
        label="Date souhaitée"
        controlId="request-date"
        [field]="requestForm.desiredDate"
      >
        <input
          id="request-date"
          type="date"
          [min]="minDate"
          [class]="inputClasses"
          [formField]="requestForm.desiredDate"
        />
      </app-form-field>
      <div class="flex flex-col gap-2 sm:col-span-2">
        <p class="text-[13px] font-medium text-foreground-secondary">Heure</p>
        @if (slots.isPending()) {
          <p class="text-caption text-foreground-muted">Recherche des créneaux…</p>
        } @else if (slots.data()?.length) {
          <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Heure">
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="model().desiredTime === ''"
              [class]="slotClass(model().desiredTime === '', false)"
              (click)="pickTime('')"
            >
              Sans heure précise
            </button>
            @for (slot of slots.data(); track slot.time) {
              <button
                type="button"
                role="radio"
                [disabled]="slot.remaining === 0"
                [attr.aria-checked]="model().desiredTime === hhmm(slot.time)"
                [attr.aria-label]="hhmm(slot.time) + (slot.remaining === 0 ? ', complet' : '')"
                [class]="slotClass(model().desiredTime === hhmm(slot.time), slot.remaining === 0)"
                (click)="pickTime(hhmm(slot.time))"
              >
                {{ hhmm(slot.time) }}
              </button>
            }
          </div>
        } @else {
          <p class="text-caption text-foreground-muted">
            Pas de créneau ce jour-là (fermé ou complet) : le garage vous proposera une heure.
          </p>
        }
      </div>
      @if (model().locationType === 'HOME') {
        <app-form-field
          label="Adresse"
          controlId="request-location"
          [field]="requestForm.location"
          class="sm:col-span-2"
        >
          <input
            id="request-location"
            [class]="inputClasses"
            [formField]="requestForm.location"
            placeholder="12 rue de Carthage, La Marsa"
          />
        </app-form-field>
      }
      <app-form-field
        label="Message (optionnel)"
        controlId="request-note"
        [field]="requestForm.note"
        class="sm:col-span-2"
      >
        <textarea
          id="request-note"
          [class]="inputClasses + ' h-24 py-2'"
          [formField]="requestForm.note"
          placeholder="Voyant allumé depuis hier, disponible le matin…"
        ></textarea>
      </app-form-field>
      @if (vehicles.data()?.length === 0) {
        <p
          class="rounded-control bg-warning-subtle px-3 py-2 text-body-sm text-warning sm:col-span-2"
        >
          Ajoutez d'abord votre véhicule dans « Mes véhicules ».
        </p>
      }
      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2">
          {{ message }}
        </p>
      }
      <div class="flex justify-end sm:col-span-2">
        <button appButton variant="accent" type="submit" [disabled]="!canSubmit()">
          Envoyer la demande
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestForm {
  readonly organizationId = input.required<number>();
  readonly services = input.required<ProviderService[]>();
  readonly initialServiceId = input<number | null>(null);
  readonly diagnosticId = input<number | null>(null);
  readonly sent = output<ServiceRequest>();

  protected readonly inputClasses = inputClasses;
  protected readonly formatMoney = formatMoney;
  protected readonly minDate = new Date().toISOString().slice(0, 10);
  protected readonly vehicles = injectMyVehiclesQuery();
  protected readonly model = signal<ServiceRequestValue>({
    vehicleId: '',
    serviceId: '',
    locationType: 'AT_PROVIDER',
    location: '',
    desiredDate: tomorrow(),
    desiredTime: '',
    note: '',
  });
  protected readonly requestForm = form(this.model, (path) =>
    validateStandardSchema(path, serviceRequestSchema),
  );
  protected readonly selectedService = computed(() =>
    this.services().find((service) => String(service.serviceId) === this.model().serviceId),
  );
  protected readonly serverError = signal<string | null>(null);
  private readonly create = injectCreateRequestMutation();
  protected readonly slots = injectSlotsQuery(
    () => this.organizationId(),
    () => this.model().desiredDate,
  );
  protected readonly canSubmit = computed(
    () => this.requestForm().dirty() && this.requestForm().valid() && !this.create.isPending(),
  );

  constructor() {
    // Preselect the service and the only vehicle, without marking the form as changed.
    effect(() => {
      const serviceId = this.initialServiceId();
      const vehicles = this.vehicles.data() ?? [];
      this.model.update((value) => ({
        ...value,
        serviceId: serviceId ? String(serviceId) : value.serviceId,
        vehicleId: vehicles.length === 1 && vehicles[0] ? String(vehicles[0].id) : value.vehicleId,
      }));
    });
    // A time picked for another day is no longer valid.
    effect(() => {
      const free = (this.slots.data() ?? [])
        .filter((slot) => slot.remaining > 0)
        .map((slot) => this.hhmm(slot.time));
      const time = this.model().desiredTime;
      if (time && this.slots.data() && !free.includes(time)) {
        this.model.update((value) => ({ ...value, desiredTime: '' }));
      }
    });
    // Home is only possible when the chosen service is offered at home.
    effect(() => {
      if (this.model().locationType === 'HOME' && !this.selectedService()?.atHome) {
        this.model.update((value) => ({ ...value, locationType: 'AT_PROVIDER' }));
      }
    });
  }

  protected hhmm(time: string): string {
    return time.slice(0, 5);
  }

  /** The time chips are not a form control: they mark the field dirty themselves. */
  protected pickTime(time: string): void {
    this.requestForm.desiredTime().value.set(time);
    this.requestForm.desiredTime().markAsDirty();
  }

  protected slotClass(selected: boolean, full: boolean): string {
    return cn(
      'h-9 rounded-full border px-4 text-body-sm transition-colors',
      full
        ? 'cursor-not-allowed border-border-subtle text-foreground-muted line-through'
        : selected
          ? 'border-transparent bg-primary font-semibold text-primary-foreground'
          : 'border-border-strong bg-surface text-foreground hover:bg-background-subtle',
    );
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.requestForm, async () => {
      this.serverError.set(null);
      try {
        const sent = await this.create.mutateAsync({
          organizationId: this.organizationId(),
          diagnosticId: this.diagnosticId(),
          value: serviceRequestSchema.parse(this.model()),
        });
        this.requestForm().reset(this.model());
        this.sent.emit(sent);
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Envoi impossible'));
      }
      return undefined;
    });
  }
}
