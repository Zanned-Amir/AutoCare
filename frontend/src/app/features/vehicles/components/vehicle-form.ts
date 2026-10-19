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
import { Button, FormField, inputClasses, Select, SelectOption } from '@shared/ui';
import { injectSaveVehicleMutation } from '../vehicles.queries';
import { VehicleFormValue, vehicleFormSchema } from '../vehicles.schema';
import { FUEL_TYPES, Vehicle, fuelTypeLabels } from '../vehicles.types';

const emptyValue = (): VehicleFormValue => ({
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  fuelType: 'ESSENCE',
  engine: '',
  mileage: 0,
  plate: '',
  vin: '',
});

const toFormValue = (vehicle: Vehicle): VehicleFormValue => ({
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year,
  fuelType: vehicle.fuelType,
  engine: vehicle.engine ?? '',
  mileage: vehicle.mileage,
  plate: vehicle.plate ?? '',
  vin: vehicle.vin ?? '',
});

@Component({
  selector: 'app-vehicle-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
      <app-form-field label="Marque" controlId="vehicle-brand" [field]="vehicleForm.brand">
        <input
          id="vehicle-brand"
          [class]="inputClasses"
          [formField]="vehicleForm.brand"
          placeholder="Renault"
        />
      </app-form-field>
      <app-form-field label="Modèle" controlId="vehicle-model" [field]="vehicleForm.model">
        <input
          id="vehicle-model"
          [class]="inputClasses"
          [formField]="vehicleForm.model"
          placeholder="Clio"
        />
      </app-form-field>
      <app-form-field label="Année" controlId="vehicle-year" [field]="vehicleForm.year">
        <input
          id="vehicle-year"
          type="number"
          inputmode="numeric"
          [class]="inputClasses"
          [formField]="vehicleForm.year"
        />
      </app-form-field>
      <app-form-field label="Carburant" controlId="vehicle-fuel" [field]="vehicleForm.fuelType">
        <app-select id="vehicle-fuel" [formField]="vehicleForm.fuelType">
          @for (fuel of fuelTypes; track fuel) {
            <app-option [value]="fuel">{{ fuelTypeLabels[fuel] }}</app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field
        label="Moteur (optionnel)"
        controlId="vehicle-engine"
        [field]="vehicleForm.engine"
      >
        <input
          id="vehicle-engine"
          [class]="inputClasses"
          [formField]="vehicleForm.engine"
          placeholder="1.5 dCi"
        />
      </app-form-field>
      <app-form-field
        label="Kilométrage (km)"
        controlId="vehicle-mileage"
        [field]="vehicleForm.mileage"
      >
        <input
          id="vehicle-mileage"
          type="number"
          inputmode="numeric"
          [class]="inputClasses"
          [formField]="vehicleForm.mileage"
        />
      </app-form-field>
      <app-form-field
        label="Immatriculation (optionnel)"
        controlId="vehicle-plate"
        [field]="vehicleForm.plate"
        hint="Aide le garage à reconnaître votre véhicule."
      >
        <input
          id="vehicle-plate"
          [class]="inputClasses + ' font-mono uppercase'"
          [formField]="vehicleForm.plate"
          placeholder="123 TU 4567"
          autocomplete="off"
        />
      </app-form-field>
      <app-form-field
        label="N° de châssis / VIN (optionnel)"
        controlId="vehicle-vin"
        [field]="vehicleForm.vin"
        hint="17 caractères, sur la carte grise (case E)."
      >
        <input
          id="vehicle-vin"
          [class]="inputClasses + ' font-mono uppercase'"
          [formField]="vehicleForm.vin"
          placeholder="VF1RJA00X12345678"
          autocomplete="off"
        />
      </app-form-field>

      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2">
          {{ message }}
        </p>
      }

      <div class="flex justify-end gap-2 sm:col-span-2">
        <button appButton variant="ghost" type="button" (click)="cancelled.emit()">Annuler</button>
        <!-- Disabled until something changed, and again after a successful save (form is reset). -->
        <button appButton type="submit" [disabled]="!canSubmit()">
          {{ vehicle() ? 'Enregistrer' : 'Ajouter le véhicule' }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleForm {
  readonly vehicle = input<Vehicle | null>(null);
  readonly saved = output<Vehicle>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly fuelTypes = FUEL_TYPES;
  protected readonly fuelTypeLabels = fuelTypeLabels;
  protected readonly model = signal<VehicleFormValue>(emptyValue());
  protected readonly vehicleForm = form(this.model, (path) =>
    validateStandardSchema(path, vehicleFormSchema),
  );
  protected readonly serverError = signal<string | null>(null);

  private readonly saveMutation = injectSaveVehicleMutation();

  protected readonly canSubmit = computed(
    () =>
      this.vehicleForm().dirty() && this.vehicleForm().valid() && !this.saveMutation.isPending(),
  );

  constructor() {
    effect(() => {
      const vehicle = this.vehicle();
      this.vehicleForm().reset(vehicle ? toFormValue(vehicle) : emptyValue());
      this.serverError.set(null);
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.vehicleForm, async () => {
      this.serverError.set(null);
      try {
        const saved = await this.saveMutation.mutateAsync({
          id: this.vehicle()?.id ?? null,
          value: vehicleFormSchema.parse(this.model()),
        });
        this.vehicleForm().reset(toFormValue(saved));
        this.saved.emit(saved);
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
