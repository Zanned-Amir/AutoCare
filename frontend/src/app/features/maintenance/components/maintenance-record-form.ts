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
import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import { Button, FormField, inputClasses, Select, SelectOption } from '@shared/ui';
import { injectMaintenanceMutations } from '../maintenance.queries';
import { MaintenanceRecordValue, maintenanceRecordSchema } from '../maintenance.schema';
import { MaintenanceRecord } from '../maintenance.types';

const today = () => new Date().toISOString().slice(0, 10);

const toValue = (record: MaintenanceRecord | null, mileage: number): MaintenanceRecordValue =>
  record
    ? {
        date: record.date,
        mileage: record.mileage,
        serviceId: record.service ? String(record.service.id) : '',
        description: record.description,
        result: record.result ?? '',
      }
    : { date: today(), mileage, serviceId: '', description: '', result: '' };

/** Owner's own entry (work done elsewhere, before AutoCare). */
@Component({
  selector: 'app-maintenance-record-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
      <app-form-field label="Date" controlId="record-date" [field]="recordForm.date">
        <input
          id="record-date"
          type="date"
          [max]="today"
          [class]="inputClasses"
          [formField]="recordForm.date"
        />
      </app-form-field>
      <app-form-field
        label="Kilométrage (km)"
        controlId="record-mileage"
        [field]="recordForm.mileage"
      >
        <input
          id="record-mileage"
          type="number"
          inputmode="numeric"
          [class]="inputClasses"
          [formField]="recordForm.mileage"
        />
      </app-form-field>
      <app-form-field
        label="Service (optionnel)"
        controlId="record-service"
        [field]="recordForm.serviceId"
      >
        <app-select id="record-service" [formField]="recordForm.serviceId">
          <app-option value="">Autre</app-option>
          @for (service of services.data() ?? []; track service.id) {
            <app-option [value]="'' + service.id">{{ service.name }}</app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field
        label="Intervention"
        controlId="record-description"
        [field]="recordForm.description"
      >
        <input
          id="record-description"
          [class]="inputClasses"
          [formField]="recordForm.description"
          placeholder="Changement des pneus avant"
        />
      </app-form-field>
      <app-form-field
        label="Détails (optionnel)"
        controlId="record-result"
        [field]="recordForm.result"
        class="sm:col-span-2"
      >
        <textarea
          id="record-result"
          [class]="inputClasses + ' h-20 py-2'"
          [formField]="recordForm.result"
        ></textarea>
      </app-form-field>
      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2">
          {{ message }}
        </p>
      }
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button appButton variant="ghost" type="button" (click)="cancelled.emit()">Annuler</button>
        <button appButton type="submit" [disabled]="!canSubmit()">Enregistrer</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceRecordForm {
  readonly vehicleId = input.required<number>();
  readonly currentMileage = input(0);
  readonly record = input<MaintenanceRecord | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly today = today();
  protected readonly inputClasses = inputClasses;
  protected readonly services = injectActiveAutoServicesQuery();
  protected readonly model = signal<MaintenanceRecordValue>(toValue(null, 0));
  protected readonly recordForm = form(this.model, (path) =>
    validateStandardSchema(path, maintenanceRecordSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  private readonly mutations = injectMaintenanceMutations(() => this.vehicleId());
  protected readonly canSubmit = computed(
    () =>
      this.recordForm().dirty() && this.recordForm().valid() && !this.mutations.save.isPending(),
  );

  constructor() {
    effect(() => {
      this.recordForm().reset(toValue(this.record(), this.currentMileage()));
      this.serverError.set(null);
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.recordForm, async () => {
      this.serverError.set(null);
      try {
        const saved = await this.mutations.save.mutateAsync({
          id: this.record()?.id ?? null,
          value: maintenanceRecordSchema.parse(this.model()),
        });
        this.recordForm().reset(toValue(saved, saved.mileage));
        this.saved.emit();
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
