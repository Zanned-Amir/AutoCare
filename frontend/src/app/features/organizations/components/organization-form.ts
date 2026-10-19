import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
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
import { Button, FormField, Icon, inputClasses, Select, SelectOption } from '@shared/ui';
import { AppMap, MapPoint } from '@shared/ui/map';
import { injectGovernoratesQuery, injectSaveOrganizationMutation } from '../organizations.queries';
import { OrganizationFormValue, organizationFormSchema } from '../organizations.schema';
import { Organization, organizationTypeLabels } from '../organizations.types';

const emptyValue = (): OrganizationFormValue => ({
  name: '',
  type: 'PROVIDER',
  description: '',
  phone: '',
  governorate: '',
  city: '',
  address: '',
  serviceZone: '',
  latitude: null,
  longitude: null,
});

const toFormValue = (organization: Organization): OrganizationFormValue => ({
  name: organization.name,
  type: organization.type,
  description: organization.description ?? '',
  phone: organization.phone,
  governorate: organization.governorate,
  city: organization.city,
  address: organization.address ?? '',
  serviceZone: organization.serviceZone ?? '',
  latitude: organization.latitude,
  longitude: organization.longitude,
});

@Component({
  selector: 'app-organization-form',
  imports: [Select, SelectOption, AppMap, Button, FormField, Icon, SignalFormField],
  template: `
    <form class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
      @if (adminCreating()) {
        <div
          class="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-background-subtle p-4 sm:col-span-2 sm:flex-row sm:items-end"
        >
          <label class="flex flex-1 flex-col gap-1.5" for="org-owner">
            <span class="text-[13px] font-medium text-foreground-secondary"
              >E-mail du propriétaire <span class="text-error">*</span></span
            >
            <input
              id="org-owner"
              type="email"
              autocomplete="off"
              placeholder="garage@exemple.tn"
              [class]="inputClasses + ' bg-surface'"
              [value]="ownerEmail()"
              (input)="ownerEmail.set($any($event.target).value)"
            />
            <span class="text-caption text-foreground-muted"
              >La personne doit déjà avoir un compte AutoCare. Elle devient propriétaire.</span
            >
          </label>
          @if (canApprove()) {
            <button
              type="button"
              role="switch"
              [attr.aria-checked]="approve()"
              class="flex h-[52px] items-center gap-3 rounded-full bg-surface px-4 text-body-sm font-semibold text-foreground"
              (click)="approve.set(!approve())"
            >
              <span
                class="flex h-5 w-9 items-center rounded-full p-0.5 transition-colors"
                [class.bg-primary]="approve()"
                [class.bg-border-strong]="!approve()"
              >
                <span
                  class="size-4 rounded-full bg-white shadow-sm transition-transform"
                  [class.translate-x-4]="approve()"
                ></span>
              </span>
              Valider tout de suite
            </button>
          }
        </div>
      }
      <app-form-field
        label="Nom de l'entreprise"
        controlId="org-name"
        [field]="orgForm.name"
        class="sm:col-span-2"
      >
        <input
          id="org-name"
          [class]="inputClasses"
          [formField]="orgForm.name"
          placeholder="Garage Ennour"
        />
      </app-form-field>

      @if (!organization()) {
        <app-form-field
          label="Activité"
          controlId="org-type"
          [field]="orgForm.type"
          class="sm:col-span-2"
        >
          <app-select id="org-type" [formField]="orgForm.type">
            <app-option value="PROVIDER">{{ typeLabels.PROVIDER }}</app-option>
            <app-option value="SELLER" disabled>{{ typeLabels.SELLER }} (bientôt)</app-option>
          </app-select>
        </app-form-field>
      }

      <app-form-field label="Téléphone" controlId="org-phone" [field]="orgForm.phone">
        <input
          id="org-phone"
          type="tel"
          [class]="inputClasses"
          [formField]="orgForm.phone"
          placeholder="+216 71 000 000"
        />
      </app-form-field>
      <app-form-field label="Gouvernorat" controlId="org-governorate" [field]="orgForm.governorate">
        <app-select id="org-governorate" [formField]="orgForm.governorate">
          <app-option value="" disabled>Choisir…</app-option>
          @for (governorate of governorates.data() ?? []; track governorate) {
            <app-option [value]="governorate">{{ governorate }}</app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field label="Ville" controlId="org-city" [field]="orgForm.city">
        <input
          id="org-city"
          [class]="inputClasses"
          [formField]="orgForm.city"
          placeholder="La Marsa"
        />
      </app-form-field>
      <app-form-field label="Adresse (optionnel)" controlId="org-address" [field]="orgForm.address">
        <input id="org-address" [class]="inputClasses" [formField]="orgForm.address" />
      </app-form-field>
      <app-form-field
        label="Zone d'intervention (optionnel)"
        controlId="org-zone"
        [field]="orgForm.serviceZone"
        class="sm:col-span-2"
      >
        <input
          id="org-zone"
          [class]="inputClasses"
          [formField]="orgForm.serviceZone"
          placeholder="Grand Tunis"
        />
      </app-form-field>
      <div class="sm:col-span-2">
        <p class="text-label text-foreground">Emplacement sur la carte</p>
        <p class="text-caption text-foreground-muted">
          Les clients proches vous voient en premier. Cliquez sur la carte, déplacez l'épingle ou
          utilisez votre position. Sans emplacement, le centre du gouvernorat est affiché.
        </p>
        <app-map
          class="mt-2 h-64 rounded-card border border-border-subtle"
          [pickable]="true"
          [pin]="pin()"
          (picked)="setLocation($event)"
        />
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button appButton variant="secondary" size="sm" type="button" (click)="useMyPosition()">
            <svg appIcon name="locate" class="mr-1.5 size-4"></svg>Utiliser ma position
          </button>
          @if (pin(); as point) {
            <button appButton variant="ghost" size="sm" type="button" (click)="clearLocation()">
              Retirer
            </button>
            <span class="text-plate text-caption text-foreground-muted"
              >{{ point.latitude.toFixed(5) }}, {{ point.longitude.toFixed(5) }}</span
            >
          }
          @if (locateError(); as message) {
            <span class="text-caption text-error">{{ message }}</span>
          }
        </div>
      </div>
      <app-form-field
        label="Description (optionnel)"
        controlId="org-description"
        [field]="orgForm.description"
        class="sm:col-span-2"
      >
        <textarea
          id="org-description"
          [class]="inputClasses + ' h-24 py-2'"
          [formField]="orgForm.description"
        ></textarea>
      </app-form-field>

      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2">
          {{ message }}
        </p>
      }

      <div class="flex justify-end gap-2 sm:col-span-2">
        @if (showCancel()) {
          <button appButton variant="ghost" type="button" (click)="cancelled.emit()">
            Annuler
          </button>
        }
        <!-- Disabled until something changed, and again after a successful save (form is reset). -->
        <button appButton type="submit" [disabled]="!canSubmit()">
          {{
            organization()
              ? 'Enregistrer'
              : adminCreating()
                ? 'Créer l’entreprise'
                : 'Créer mon entreprise'
          }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationForm {
  readonly organization = input<Organization | null>(null);
  readonly showCancel = input(true);
  /** `admin`: saves through /admin/organizations and, on creation, asks for the owner. */
  readonly mode = input<'self' | 'admin'>('self');
  /** Admin creation: the owner field starts with this e-mail (often the staff member's own). */
  readonly defaultOwnerEmail = input('');
  /** Admin creation: without `organization:approve` the new organization waits in the queue. */
  readonly canApprove = input(true);
  readonly saved = output<Organization>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly typeLabels = organizationTypeLabels;
  protected readonly governorates = injectGovernoratesQuery();
  protected readonly model = signal<OrganizationFormValue>(emptyValue());
  protected readonly orgForm = form(this.model, (path) =>
    validateStandardSchema(path, organizationFormSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  protected readonly ownerEmail = linkedSignal(() => this.defaultOwnerEmail());
  protected readonly approve = linkedSignal(() => this.canApprove());
  protected readonly adminCreating = computed(
    () => this.mode() === 'admin' && this.organization() === null,
  );
  private readonly ownerValid = computed(
    () => !this.adminCreating() || /^\S+@\S+\.\S+$/.test(this.ownerEmail().trim()),
  );

  private readonly saveMutation = injectSaveOrganizationMutation();

  /** The map pin is not a Signal Forms control, so its change counts as dirty separately. */
  private readonly savedLocation = signal('null,null');
  protected readonly pin = computed<MapPoint | null>(() => {
    const { latitude, longitude } = this.model();
    return latitude !== null && longitude !== null ? { latitude, longitude } : null;
  });
  protected readonly locateError = signal<string | null>(null);
  private readonly locationChanged = computed(
    () => `${this.model().latitude},${this.model().longitude}` !== this.savedLocation(),
  );

  protected readonly canSubmit = computed(
    () =>
      (this.orgForm().dirty() || this.locationChanged()) &&
      this.orgForm().valid() &&
      this.ownerValid() &&
      !this.saveMutation.isPending(),
  );

  protected setLocation(point: MapPoint): void {
    const round = (value: number) => Math.round(value * 1e6) / 1e6;
    this.model.update((value) => ({
      ...value,
      latitude: round(point.latitude),
      longitude: round(point.longitude),
    }));
  }

  protected clearLocation(): void {
    this.model.update((value) => ({ ...value, latitude: null, longitude: null }));
  }

  protected useMyPosition(): void {
    this.locateError.set(null);
    if (!('geolocation' in navigator)) {
      this.locateError.set('Position indisponible sur cet appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => this.setLocation({ latitude: coords.latitude, longitude: coords.longitude }),
      () => this.locateError.set('Position refusée : placez l’épingle à la main.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  private remember(value: OrganizationFormValue): void {
    this.savedLocation.set(`${value.latitude},${value.longitude}`);
  }

  constructor() {
    effect(() => {
      const organization = this.organization();
      const value = organization ? toFormValue(organization) : emptyValue();
      this.orgForm().reset(value);
      this.remember(value);
      this.serverError.set(null);
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.orgForm, async () => {
      this.serverError.set(null);
      try {
        const saved = await this.saveMutation.mutateAsync({
          id: this.organization()?.id ?? null,
          value: organizationFormSchema.parse(this.model()),
          admin:
            this.mode() === 'admin'
              ? {
                  ownerEmail: this.ownerEmail().trim(),
                  approve: this.canApprove() && this.approve(),
                }
              : undefined,
        });
        this.orgForm().reset(toFormValue(saved));
        this.remember(toFormValue(saved));
        this.saved.emit(saved);
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
