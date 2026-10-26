import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
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
import { QueryClient } from '@tanstack/angular-query-experimental';

import { problemMessage } from '@core/api/api';
import {
  Button,
  DropZone,
  DropZoneItem,
  FormField,
  Icon,
  inputClasses,
  Select,
  SelectOption,
} from '@shared/ui';
import { VehiclesApi } from '../vehicles.api';
import {
  injectSaveVehicleMutation,
  injectVehicleMakesQuery,
  vehicleKeys,
} from '../vehicles.queries';
import { VehicleFormValue, vehicleFormSchema } from '../vehicles.schema';
import { FUEL_TYPES, Vehicle, fuelTypeLabels } from '../vehicles.types';
import { VehiclePlateInput } from './vehicle-plate-input';

/** Sentinel option of the brand / model selects: switches to free text. */
const OTHER = '__other__';

/** Same limits as the photos panel / backend. */
const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** A photo picked while creating a vehicle: uploaded once the vehicle has an id. */
interface PendingPhoto {
  id: string;
  file: File;
  url: string;
}

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
  imports: [
    Select,
    SelectOption,
    Button,
    DropZone,
    FormField,
    Icon,
    SignalFormField,
    VehiclePlateInput,
  ],
  template: `
    <form class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
      <!-- Locked once the vehicle exists and only photos are left to send again. -->
      <fieldset class="contents" [disabled]="createdVehicle() !== null">
        <!-- Required fields -->
        <app-form-field label="Marque" controlId="vehicle-brand" [field]="vehicleForm.brand">
          <div class="grid gap-2">
            @if (!catalog.isError()) {
              <app-select
                id="vehicle-brand"
                [placeholder]="catalog.isPending() ? 'Chargement…' : 'Choisir une marque'"
                [disabled]="catalog.isPending()"
                [value]="selectedBrand()"
                (valueChange)="onBrandChange($event)"
              >
                @for (make of makes(); track make.name) {
                  <app-option [value]="make.name">{{ make.name }}</app-option>
                }
                <app-option [value]="other">Autre marque…</app-option>
              </app-select>
            }
            @if (freeBrand()) {
              <input
                [id]="catalog.isError() ? 'vehicle-brand' : 'vehicle-brand-custom'"
                [class]="inputClasses"
                [formField]="vehicleForm.brand"
                placeholder="Renault"
                autocomplete="off"
              />
            }
          </div>
        </app-form-field>
        <app-form-field label="Modèle" controlId="vehicle-model" [field]="vehicleForm.model">
          <div class="grid gap-2">
            @if (!freeBrand()) {
              <app-select
                id="vehicle-model"
                placeholder="Choisir un modèle"
                [disabled]="!selectedBrand()"
                [value]="selectedModel()"
                (valueChange)="onModelChange($event)"
              >
                @for (name of modelOptions(); track name) {
                  <app-option [value]="name">{{ name }}</app-option>
                }
                <app-option [value]="other">Autre modèle…</app-option>
              </app-select>
            }
            @if (freeModel()) {
              <input
                [id]="freeBrand() ? 'vehicle-model' : 'vehicle-model-custom'"
                [class]="inputClasses"
                [formField]="vehicleForm.model"
                placeholder="Clio"
                autocomplete="off"
              />
            }
          </div>
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

        <!-- Optional fields, collapsed by default -->
        <div class="rounded-control border border-border-subtle sm:col-span-2">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-controls="vehicle-optional"
            [attr.aria-expanded]="optionalOpen()"
            (click)="optionalOpen.set(!optionalOpen())"
          >
            <span class="text-body-sm font-semibold text-primary">
              Informations complémentaires
              <span class="font-normal text-foreground-muted">(optionnel)</span>
            </span>
            <svg
              appIcon
              name="chevron-down"
              class="size-4 shrink-0 text-foreground-muted transition-transform"
              [class.rotate-180]="optionalOpen()"
            ></svg>
          </button>

          @if (optionalOpen()) {
            <div
              id="vehicle-optional"
              class="grid gap-4 border-t border-border-subtle p-4 sm:grid-cols-2"
            >
              <app-vehicle-plate-input
                class="sm:col-span-2"
                [value]="model().plate"
                [showErrors]="submitAttempted()"
                (valueChange)="onPlateChange($event)"
              />
              <app-form-field
                label="Moteur"
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
                label="N° de châssis / VIN"
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

              <!-- Photos: only when creating (an existing vehicle has its own photos panel). -->
              @if (!vehicle()) {
                <div class="sm:col-span-2">
                  <p class="mb-2 text-label text-foreground">Photos</p>
                  <app-drop-zone
                    [hint]="
                      'JPG, PNG ou WebP, 5 Mo maximum · ' +
                      pendingPhotos().length +
                      ' / ' +
                      maxPhotos +
                      ' photos'
                    "
                    [items]="photoItems()"
                    [disabled]="pendingPhotos().length >= maxPhotos"
                    (files)="addPhotos($event)"
                    (removed)="removePhoto($event.id)"
                  />
                  @if (photoError(); as message) {
                    <p class="mt-2 text-body-sm text-error">{{ message }}</p>
                  }
                </div>
              }
            </div>
          }
        </div>
      </fieldset>

      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2">
          {{ message }}
        </p>
      }

      <div class="flex justify-end gap-2 sm:col-span-2">
        <button appButton variant="ghost" type="button" (click)="close()">
          {{ createdVehicle() ? 'Terminer sans photos' : 'Annuler' }}
        </button>
        <!-- Disabled until something changed, and again after a successful save (form is reset). -->
        <button appButton type="submit" [disabled]="!canSubmit()">
          {{ submitLabel() }}
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
  protected readonly other = OTHER;
  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly model = signal<VehicleFormValue>(emptyValue());
  protected readonly vehicleForm = form(this.model, (path) =>
    validateStandardSchema(path, vehicleFormSchema),
  );
  protected readonly serverError = signal<string | null>(null);

  protected readonly catalog = injectVehicleMakesQuery();
  private readonly saveMutation = injectSaveVehicleMutation();
  private readonly api = inject(VehiclesApi);
  private readonly queryClient = inject(QueryClient);

  /** The user picked "Autre…" (or edits a vehicle whose brand / model is not in the catalog). */
  protected readonly customBrand = signal(false);
  protected readonly customModel = signal(false);

  /** Optional section (engine, plate, VIN, photos). */
  protected readonly optionalOpen = signal(false);
  protected readonly pendingPhotos = signal<PendingPhoto[]>([]);
  protected readonly photoError = signal<string | null>(null);
  protected readonly uploadingPhotos = signal(false);
  /** Set on the first submit click: from then on every error is shown. */
  protected readonly submitAttempted = signal(false);
  /** Set when the vehicle was created but some photos failed: only the photos are retried. */
  protected readonly createdVehicle = signal<Vehicle | null>(null);

  protected readonly makes = computed(() => this.catalog.data() ?? []);
  private readonly selectedMake = computed(() =>
    this.makes().find((make) => make.name === this.model().brand),
  );
  protected readonly modelOptions = computed(() => this.selectedMake()?.models ?? []);

  /** Select values: '' means nothing chosen (placeholder). */
  protected readonly selectedBrand = computed(() =>
    this.customBrand() ? OTHER : (this.selectedMake()?.name ?? ''),
  );
  protected readonly selectedModel = computed(() =>
    this.customModel()
      ? OTHER
      : (this.modelOptions().find((name) => name === this.model().model) ?? ''),
  );

  /** Text inputs are shown for "Autre…", and as a fallback when the catalog cannot be loaded. */
  protected readonly freeBrand = computed(() => this.customBrand() || this.catalog.isError());
  protected readonly freeModel = computed(() => this.freeBrand() || this.customModel());

  private readonly optionalInvalid = computed(
    () =>
      this.vehicleForm.engine().invalid() ||
      this.vehicleForm.plate().invalid() ||
      this.vehicleForm.vin().invalid(),
  );

  protected readonly canSubmit = computed(() => {
    if (this.saveMutation.isPending() || this.uploadingPhotos()) return false;
    if (this.createdVehicle()) return this.pendingPhotos().length > 0;
    return this.vehicleForm().dirty() && this.vehicleForm().valid();
  });

  protected readonly photoItems = computed<DropZoneItem[]>(() =>
    this.pendingPhotos().map((photo) => ({
      id: photo.id,
      name: photo.file.name,
      url: photo.url,
      image: true,
    })),
  );

  protected readonly submitLabel = computed(() => {
    if (this.uploadingPhotos()) return 'Envoi des photos…';
    if (this.createdVehicle()) return 'Renvoyer les photos';
    return this.vehicle() ? 'Enregistrer' : 'Ajouter le véhicule';
  });

  constructor() {
    effect(() => {
      const vehicle = this.vehicle();
      this.vehicleForm().reset(vehicle ? toFormValue(vehicle) : emptyValue());
      this.serverError.set(null);
      this.submitAttempted.set(false);
      // Editing a vehicle that already has optional details: show them.
      this.optionalOpen.set(!!vehicle && !!(vehicle.engine || vehicle.plate || vehicle.vin));
    });

    // Editing a vehicle whose brand / model is not in the catalog: start in free-text mode.
    effect(() => {
      const vehicle = this.vehicle();
      const makes = this.makes();
      if (!vehicle || makes.length === 0) {
        this.customBrand.set(false);
        this.customModel.set(false);
        return;
      }
      const make = makes.find((m) => m.name === vehicle.brand);
      this.customBrand.set(!make);
      this.customModel.set(!make?.models.includes(vehicle.model));
    });

    inject(DestroyRef).onDestroy(() =>
      this.pendingPhotos().forEach((photo) => URL.revokeObjectURL(photo.url)),
    );
  }

  protected onBrandChange(value: string): void {
    const custom = value === OTHER;
    this.customBrand.set(custom);
    this.customModel.set(custom);
    this.model.update((v) => ({ ...v, brand: custom ? '' : value, model: '' }));
    // Programmatic changes do not flag the field by themselves.
    const field = this.vehicleForm.brand();
    field.markAsDirty();
    field.markAsTouched();
  }

  protected onModelChange(value: string): void {
    const custom = value === OTHER;
    this.customModel.set(custom);
    this.model.update((v) => ({ ...v, model: custom ? '' : value }));
    const field = this.vehicleForm.model();
    field.markAsDirty();
    field.markAsTouched();
  }

  protected onPlateChange(value: string): void {
    this.model.update((v) => ({ ...v, plate: value }));
    // Programmatic changes do not flag the field by themselves.
    this.vehicleForm.plate().markAsDirty();
  }

  protected addPhotos(files: File[]): void {
    this.photoError.set(null);
    const accepted: PendingPhoto[] = [];
    for (const file of files) {
      if (this.pendingPhotos().length + accepted.length >= MAX_PHOTOS) {
        this.photoError.set(`${MAX_PHOTOS} photos maximum.`);
        break;
      }
      if (!PHOTO_TYPES.includes(file.type)) {
        this.photoError.set('Format non pris en charge (JPEG, PNG ou WebP).');
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        this.photoError.set('Photo trop lourde (5 Mo maximum).');
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    this.pendingPhotos.update((list) => [...list, ...accepted]);
  }

  protected removePhoto(id: string | number): void {
    const photo = this.pendingPhotos().find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    this.pendingPhotos.update((list) => list.filter((p) => p.id !== id));
  }

  protected close(): void {
    const created = this.createdVehicle();
    if (created) this.saved.emit(created);
    else this.cancelled.emit();
  }

  protected save(event: Event): void {
    event.preventDefault();

    const created = this.createdVehicle();
    if (created) {
      void this.retryPhotos(created);
      return;
    }

    this.submitAttempted.set(true);
    // Errors in the collapsed section would be invisible: open it.
    if (this.optionalInvalid()) this.optionalOpen.set(true);

    void submit(this.vehicleForm, async () => {
      this.serverError.set(null);
      let saved: Vehicle;
      try {
        saved = await this.saveMutation.mutateAsync({
          id: this.vehicle()?.id ?? null,
          value: vehicleFormSchema.parse(this.model()),
        });
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
        return undefined;
      }
      this.vehicleForm().reset(toFormValue(saved));
      if (await this.uploadPendingPhotos(saved)) this.saved.emit(saved);
      return undefined;
    });
  }

  private async retryPhotos(vehicle: Vehicle): Promise<void> {
    this.serverError.set(null);
    if (await this.uploadPendingPhotos(vehicle)) this.saved.emit(vehicle);
  }

  /**
   * Sends the photos picked during creation, one after the other. Returns true when nothing is
   * left to send. A failed photo never fails the save: the vehicle exists, so the form switches
   * to a "retry photos" state instead of letting the user create a duplicate.
   */
  private async uploadPendingPhotos(vehicle: Vehicle): Promise<boolean> {
    const photos = this.pendingPhotos();
    if (photos.length === 0) return true;

    this.uploadingPhotos.set(true);
    const failed: PendingPhoto[] = [];
    for (const photo of photos) {
      try {
        await this.api.uploadPhoto(vehicle.id, photo.file);
        URL.revokeObjectURL(photo.url);
      } catch {
        failed.push(photo);
      }
    }
    this.uploadingPhotos.set(false);
    this.pendingPhotos.set(failed);
    await this.queryClient.invalidateQueries({ queryKey: vehicleKeys.photos(vehicle.id) });

    if (failed.length === 0) return true;
    this.createdVehicle.set(vehicle);
    this.serverError.set(
      `Véhicule ajouté, mais ${failed.length} photo(s) n'ont pas pu être envoyées. ` +
        'Vous pouvez réessayer ou les ajouter plus tard depuis la fiche du véhicule.',
    );
    return false;
  }
}
