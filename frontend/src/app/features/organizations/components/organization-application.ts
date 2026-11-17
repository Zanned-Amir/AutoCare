import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormField as SignalFormField, form, validateStandardSchema } from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import { injectProviderServiceMutations } from '@features/providers/providers.queries';
import {
  Button,
  Card,
  DropZone,
  DropZoneItem,
  FileButton,
  FormField,
  Icon,
  MultiSelectChip,
  MultiSelectOption,
  Select,
  SelectOption,
  StepRecap,
  Stepper,
  inputClasses,
} from '@shared/ui';
import { AppMap, MapPoint } from '@shared/ui/map';
import { cn } from '@shared/utils/cn';
import {
  injectGovernoratesQuery,
  injectOrganizationFileMutations,
  injectSaveOrganizationMutation,
} from '../organizations.queries';
import { OrganizationFormValue, organizationFormSchema } from '../organizations.schema';
import { Organization } from '../organizations.types';

const STEPS = ['Activité', 'Coordonnées', 'Emplacement', 'Services', 'Photos', 'Vérification'];

/** A file chosen in the browser, sent once the organization exists. */
interface StagedFile {
  id: number;
  file: File;
  /** Object URL for an image preview. */
  url: string | null;
}

let nextStagedId = 1;

/** Form fields checked before leaving each step; services and documents are checked apart. */
const STEP_FIELDS: (keyof OrganizationFormValue)[][] = [
  ['type', 'name', 'description'],
  ['phone', 'governorate', 'city', 'address', 'serviceZone'],
  [],
  [],
  [],
];

const SERVICES_STEP = 3;
const FILES_STEP = 4;

/**
 * Organization application in steps (toutestcasa checkout): stepper on top, one step in the main
 * card, recaps with "Modifier" on the last step, a summary beside it. Sends the organization,
 * then offers the chosen services; the team validates it before it shows in search.
 */
@Component({
  selector: 'app-organization-application',
  imports: [
    AppMap,
    Button,
    DropZone,
    FileButton,
    Card,
    FormField,
    Icon,
    MultiSelectChip,
    Select,
    SelectOption,
    SignalFormField,
    StepRecap,
    Stepper,
  ],
  template: `
    <app-stepper [steps]="steps" [current]="step()" (stepChange)="goTo($event)" />

    <div class="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
      <app-card class="flex min-w-0 flex-1 flex-col gap-6 md:p-8">
        @switch (step()) {
          @case (0) {
            <section class="flex flex-col gap-4">
              <div>
                <h2 class="text-h4 text-foreground">Votre activité</h2>
                <p class="text-body-sm text-foreground-secondary">
                  Ce que voient les clients en premier dans la recherche.
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Activité">
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="model().type === 'PROVIDER'"
                  [class]="typeClass('PROVIDER')"
                  (click)="setType('PROVIDER')"
                >
                  <svg appIcon name="wrench" class="size-5 text-primary"></svg>
                  <span class="mt-2 block text-label text-foreground">Garage ou service</span>
                  <span class="block text-body-sm text-foreground-secondary"
                    >Atelier, vidange à domicile, dépannage, pneus…</span
                  >
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked="false"
                  disabled
                  [class]="typeClass('SELLER')"
                >
                  <svg appIcon name="briefcase" class="size-5 text-foreground-muted"></svg>
                  <span class="mt-2 block text-label text-foreground-muted"
                    >Vente de pièces (bientôt)</span
                  >
                  <span class="block text-body-sm text-foreground-muted"
                    >Le marketplace arrive dans la prochaine version.</span
                  >
                </button>
              </div>
              <app-form-field
                label="Nom de l'entreprise"
                controlId="app-name"
                [field]="orgForm.name"
                [required]="true"
              >
                <input
                  id="app-name"
                  [class]="inputClasses"
                  [formField]="orgForm.name"
                  placeholder="Garage Ennour"
                />
              </app-form-field>
              <app-form-field
                label="Présentation"
                controlId="app-description"
                [field]="orgForm.description"
                hint="Facultatif · ce que vous faites, depuis quand, vos marques."
              >
                <textarea
                  id="app-description"
                  [class]="inputClasses + ' h-28 py-2'"
                  [formField]="orgForm.description"
                ></textarea>
              </app-form-field>
            </section>
          }
          @case (1) {
            <section class="flex flex-col gap-4">
              <div>
                <h2 class="text-h4 text-foreground">Coordonnées</h2>
                <p class="text-body-sm text-foreground-secondary">
                  Le téléphone et la ville s’affichent sur votre fiche publique.
                </p>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <app-form-field
                  label="Téléphone"
                  controlId="app-phone"
                  [field]="orgForm.phone"
                  [required]="true"
                >
                  <input
                    id="app-phone"
                    type="tel"
                    [class]="inputClasses"
                    [formField]="orgForm.phone"
                    placeholder="+216 71 000 000"
                  />
                </app-form-field>
                <app-form-field
                  label="Gouvernorat"
                  controlId="app-governorate"
                  [field]="orgForm.governorate"
                  [required]="true"
                >
                  <app-select id="app-governorate" [formField]="orgForm.governorate">
                    <app-option value="" disabled>Choisir…</app-option>
                    @for (governorate of governorates.data() ?? []; track governorate) {
                      <app-option [value]="governorate">{{ governorate }}</app-option>
                    }
                  </app-select>
                </app-form-field>
                <app-form-field
                  label="Ville"
                  controlId="app-city"
                  [field]="orgForm.city"
                  [required]="true"
                >
                  <input
                    id="app-city"
                    [class]="inputClasses"
                    [formField]="orgForm.city"
                    placeholder="La Marsa"
                  />
                </app-form-field>
                <app-form-field
                  label="Adresse"
                  controlId="app-address"
                  [field]="orgForm.address"
                  hint="Facultatif"
                >
                  <input id="app-address" [class]="inputClasses" [formField]="orgForm.address" />
                </app-form-field>
                <app-form-field
                  label="Zone d'intervention"
                  controlId="app-zone"
                  [field]="orgForm.serviceZone"
                  hint="Facultatif · pour un service à domicile, par exemple « Grand Tunis »."
                  class="sm:col-span-2"
                >
                  <input id="app-zone" [class]="inputClasses" [formField]="orgForm.serviceZone" />
                </app-form-field>
              </div>
            </section>
          }
          @case (2) {
            <section class="flex flex-col gap-3">
              <div>
                <h2 class="text-h4 text-foreground">Emplacement sur la carte</h2>
                <p class="text-body-sm text-foreground-secondary">
                  Les clients proches vous voient en premier. Cliquez sur la carte, déplacez
                  l’épingle ou utilisez votre position. Sans emplacement, le centre du gouvernorat
                  est affiché.
                </p>
              </div>
              <app-map
                class="h-72 rounded-card border border-border-subtle"
                [pickable]="true"
                [pin]="pin()"
                (picked)="setLocation($event)"
              />
              <div class="flex flex-wrap items-center gap-2">
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  (click)="useMyPosition()"
                >
                  <svg appIcon name="locate" class="mr-1.5 size-4"></svg>Utiliser ma position
                </button>
                @if (pin(); as point) {
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="clearLocation()"
                  >
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
            </section>
          }
          @case (3) {
            <section class="flex flex-col gap-4">
              <div>
                <h2 class="text-h4 text-foreground">Services proposés</h2>
                <p class="text-body-sm text-foreground-secondary">
                  Les clients vous trouvent par service. Les prix se règlent ensuite dans votre
                  espace pro (sans prix : « sur devis »).
                </p>
              </div>
              <div>
                <app-multi-select-chip
                  label="Choisir des services"
                  searchPlaceholder="Rechercher un service"
                  [options]="serviceOptions()"
                  [value]="serviceIds()"
                  (valueChange)="setServices($event)"
                />
              </div>
              <ul class="flex flex-col gap-2">
                @for (id of serviceIds(); track id) {
                  <li
                    class="flex items-center justify-between gap-3 rounded-xl border border-border-subtle px-4 py-3"
                  >
                    <span class="min-w-0 truncate text-label text-foreground">{{
                      serviceName(id)
                    }}</span>
                    <span class="flex shrink-0 items-center gap-3">
                      <label class="flex items-center gap-2 text-body-sm text-foreground-secondary">
                        <input
                          type="checkbox"
                          class="size-4 accent-primary"
                          [checked]="atHome().includes(id)"
                          (change)="toggleAtHome(id)"
                        />
                        À domicile
                      </label>
                      <button
                        type="button"
                        class="grid size-8 place-items-center rounded-full text-foreground-muted hover:bg-background-subtle hover:text-foreground"
                        [attr.aria-label]="'Retirer ' + serviceName(id)"
                        (click)="removeService(id)"
                      >
                        <svg appIcon name="x" class="size-4"></svg>
                      </button>
                    </span>
                  </li>
                } @empty {
                  <li
                    class="rounded-xl border border-dashed border-border px-4 py-6 text-center text-body-sm text-foreground-secondary"
                  >
                    Choisissez au moins un service : sans service, votre fiche n’apparaît pas dans
                    la recherche.
                  </li>
                }
              </ul>
            </section>
          }
          @case (4) {
            <section class="flex flex-col gap-5">
              <div>
                <h2 class="text-h4 text-foreground">Photos et documents</h2>
                <p class="text-body-sm text-foreground-secondary">
                  Une fiche avec logo et photos de l’atelier inspire confiance (facultatif). Au
                  moins un document est obligatoire : notre équipe en a besoin pour valider
                  l’entreprise, et lui seul le voit.
                </p>
              </div>
              <div class="flex items-center gap-4">
                @if (logo(); as staged) {
                  <img
                    [src]="staged.url"
                    alt="Logo"
                    class="size-20 rounded-2xl border border-border-subtle object-cover"
                  />
                } @else {
                  <span
                    class="grid size-20 place-items-center rounded-2xl bg-surface-muted text-caption text-foreground-muted"
                    >Logo</span
                  >
                }
                <div class="flex flex-wrap gap-2">
                  <app-file-button (picked)="setLogo($event)">{{
                    logo() ? 'Changer le logo' : 'Ajouter un logo'
                  }}</app-file-button>
                  @if (logo()) {
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="setLogo(null)"
                    >
                      Retirer
                    </button>
                  }
                </div>
              </div>
              <div>
                <p class="mb-2 text-label text-foreground">Photos de l’atelier</p>
                <app-drop-zone
                  [hint]="'JPG, PNG ou WebP, 5 Mo maximum · ' + photos().length + ' / 8 photos'"
                  [items]="photoItems()"
                  [disabled]="photos().length >= 8"
                  (files)="addPhotos($event)"
                  (removed)="removeStaged(photos, $event.id)"
                />
              </div>
              <div>
                <p class="mb-2 text-label text-foreground">
                  Documents de validation <span class="text-error" aria-hidden="true">*</span>
                </p>
                <app-drop-zone
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  hint="Registre de commerce, patente… PDF ou image, 10 Mo maximum"
                  [items]="documentItems()"
                  (files)="addDocuments($event)"
                  (removed)="removeStaged(documents, $event.id)"
                />
              </div>
            </section>
          }
          @case (5) {
            <section class="flex flex-col gap-3">
              <div>
                <h2 class="text-h4 text-foreground">Vérification</h2>
                <p class="text-body-sm text-foreground-secondary">
                  Relisez avant d’envoyer : notre équipe valide la demande, généralement sous 48 h.
                </p>
              </div>
              <app-step-recap
                title="Activité"
                [lines]="[model().name, 'Garage ou service', model().description]"
                (edit)="goTo(0)"
              />
              <app-step-recap
                title="Coordonnées"
                [lines]="[
                  model().phone,
                  addressLine(),
                  model().serviceZone ? 'Zone : ' + model().serviceZone : null,
                ]"
                (edit)="goTo(1)"
              />
              <app-step-recap
                title="Emplacement"
                [lines]="[pin() ? 'Épingle placée sur la carte' : 'Centre du gouvernorat']"
                (edit)="goTo(2)"
              />
              <app-step-recap title="Services" [lines]="[servicesSummary()]" (edit)="goTo(3)" />
              <app-step-recap
                title="Photos et documents"
                [lines]="[filesSummary()]"
                (edit)="goTo(4)"
              />
              <label class="mt-2 flex items-start gap-2 text-body-sm text-foreground-secondary">
                <input
                  type="checkbox"
                  class="mt-0.5 size-4 accent-primary"
                  [checked]="certified()"
                  (change)="certified.set(!certified())"
                />
                Je certifie représenter cette entreprise et que ces informations sont exactes.
              </label>
            </section>
          }
        }

        @if (error(); as message) {
          <p
            class="rounded-2xl border border-error bg-error-subtle px-4 py-3 text-body-sm text-error"
          >
            {{ message }}
          </p>
        }

        <div
          class="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between"
        >
          @if (step() > 0) {
            <button
              appButton
              variant="ghost"
              type="button"
              [disabled]="sending()"
              (click)="goTo(step() - 1)"
            >
              <svg appIcon name="arrow-left" class="mr-1.5 size-4"></svg>Retour
            </button>
          } @else {
            <button appButton variant="ghost" type="button" (click)="cancelled.emit()">
              Annuler
            </button>
          }
          @if (step() < steps.length - 1) {
            <button appButton type="button" (click)="next()">
              Continuer<svg appIcon name="arrow-right" class="ml-1.5 size-4"></svg>
            </button>
          } @else {
            <button
              appButton
              variant="accent"
              type="button"
              [disabled]="!certified() || sending()"
              (click)="send()"
            >
              {{ sending() ? 'Envoi…' : 'Envoyer ma demande' }}
            </button>
          }
        </div>
      </app-card>

      <aside class="flex w-full flex-col gap-4 lg:sticky lg:top-24 lg:w-[340px]">
        <app-card class="flex flex-col gap-3">
          <p class="text-overline text-accent-text">Votre fiche</p>
          <p class="text-h4 text-primary">{{ model().name || 'Nom de l’entreprise' }}</p>
          <p class="text-body-sm text-foreground-secondary">
            {{ placeLine() || 'Ville, gouvernorat' }}
          </p>
          <p class="text-body-sm text-foreground-secondary">{{ servicesSummary() }}</p>
        </app-card>
        <app-card class="flex flex-col gap-3">
          <p class="text-label text-foreground">Et ensuite ?</p>
          <ol class="flex flex-col gap-3 text-body-sm text-foreground-secondary">
            @for (item of nextSteps; track item; let i = $index) {
              <li class="flex gap-3">
                <span
                  class="grid size-6 shrink-0 place-items-center rounded-full bg-primary-subtle text-caption font-semibold text-primary"
                  >{{ i + 1 }}</span
                >
                {{ item }}
              </li>
            }
          </ol>
        </app-card>
      </aside>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationApplication {
  readonly submitted = output<{
    organization: Organization;
    servicesFailed: number;
    filesFailed: number;
  }>();
  readonly cancelled = output<void>();

  protected readonly steps = STEPS;
  protected readonly nextSteps = [
    'Notre équipe vérifie votre demande (sous 48 h en général).',
    'Si un document manque ou est illisible, nous vous contactons par téléphone.',
    'Votre fiche apparaît dans la recherche et les demandes arrivent dans votre espace pro.',
  ];
  protected readonly inputClasses = inputClasses;
  protected readonly governorates = injectGovernoratesQuery();
  private readonly services = injectActiveAutoServicesQuery();

  protected readonly model = signal<OrganizationFormValue>({
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
  protected readonly orgForm = form(this.model, (path) =>
    validateStandardSchema(path, organizationFormSchema),
  );

  protected readonly step = signal(0);
  protected readonly serviceIds = signal<number[]>([]);
  protected readonly atHome = signal<number[]>([]);
  protected readonly certified = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly locateError = signal<string | null>(null);

  private readonly createdId = signal(0);
  private readonly saveOrganization = injectSaveOrganizationMutation();
  private readonly offer = injectProviderServiceMutations(() => this.createdId());
  private readonly fileMutations = injectOrganizationFileMutations(() => this.createdId());

  protected readonly logo = signal<StagedFile | null>(null);
  protected readonly photos = signal<StagedFile[]>([]);
  protected readonly documents = signal<StagedFile[]>([]);
  protected readonly photoItems = computed(() => this.photos().map(toItem));
  protected readonly documentItems = computed(() => this.documents().map(toItem));
  protected readonly filesSummary = computed(() => {
    const parts = [
      this.logo() ? 'logo' : null,
      this.photos().length ? `${this.photos().length} photo(s)` : null,
      this.documents().length ? `${this.documents().length} document(s)` : null,
    ].filter((part) => part !== null);
    return parts.length ? parts.join(', ') : 'Aucun fichier';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() =>
      [this.logo(), ...this.photos()].forEach(
        (staged) => staged?.url && URL.revokeObjectURL(staged.url),
      ),
    );
  }

  protected setLogo(file: File | null): void {
    const previous = this.logo();
    if (previous?.url) URL.revokeObjectURL(previous.url);
    this.logo.set(file ? stage(file) : null);
  }

  protected addPhotos(files: File[]): void {
    const room = 8 - this.photos().length;
    this.photos.update((list) => [...list, ...files.slice(0, room).map(stage)]);
  }

  protected addDocuments(files: File[]): void {
    this.error.set(null);
    this.documents.update((list) => [...list, ...files.slice(0, 10 - list.length).map(stage)]);
  }

  protected removeStaged(list: WritableSignal<StagedFile[]>, id: string | number): void {
    const removed = list().find((staged) => staged.id === id);
    if (removed?.url) URL.revokeObjectURL(removed.url);
    list.update((items) => items.filter((staged) => staged.id !== id));
  }

  protected readonly serviceOptions = computed<MultiSelectOption<number>[]>(() =>
    (this.services.data() ?? []).map((service) => ({ value: service.id, label: service.name })),
  );
  protected readonly pin = computed<MapPoint | null>(() => {
    const { latitude, longitude } = this.model();
    return latitude !== null && longitude !== null ? { latitude, longitude } : null;
  });
  protected readonly servicesSummary = computed(() => {
    const count = this.serviceIds().length;
    if (!count) return 'Aucun service choisi pour l’instant';
    const home = this.atHome().filter((id) => this.serviceIds().includes(id)).length;
    return `${count} service(s)` + (home ? `, dont ${home} à domicile` : '');
  });

  protected readonly placeLine = computed(() =>
    [this.model().city, this.model().governorate].filter((part) => part.trim()).join(', '),
  );
  protected readonly addressLine = computed(() =>
    [this.model().address, this.placeLine()].filter((part) => part.trim()).join(', '),
  );

  protected removeService(id: number): void {
    this.setServices(this.serviceIds().filter((s) => s !== id));
  }

  protected typeClass(type: 'PROVIDER' | 'SELLER'): string {
    return cn(
      'flex flex-col rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed',
      this.model().type === type && type === 'PROVIDER'
        ? 'border-accent'
        : 'border-border-subtle enabled:hover:border-border-strong',
    );
  }

  protected setType(type: 'PROVIDER' | 'SELLER'): void {
    this.model.update((value) => ({ ...value, type }));
  }

  protected serviceName(id: number): string {
    return this.serviceOptions().find((option) => option.value === id)?.label ?? `Service ${id}`;
  }

  protected setServices(ids: number[]): void {
    this.error.set(null);
    this.serviceIds.set(ids);
    this.atHome.update((list) => list.filter((id) => ids.includes(id)));
  }

  protected toggleAtHome(id: number): void {
    this.atHome.update((list) =>
      list.includes(id) ? list.filter((s) => s !== id) : [...list, id],
    );
  }

  /** Back to a finished step only; forward goes through "Continuer" and its checks. */
  protected goTo(index: number): void {
    if (index < this.step()) {
      this.error.set(null);
      this.step.set(index);
    }
  }

  protected next(): void {
    (STEP_FIELDS[this.step()] ?? []).forEach((field) => this.orgForm[field]().markAsTouched());
    const problem = this.stepProblem(this.step());
    this.error.set(problem);
    if (!problem) this.step.update((value) => value + 1);
  }

  /**
   * What still blocks a step, or null. Field errors are read from the schema itself, so a
   * step can never be left with an invalid field.
   */
  private stepProblem(step: number): string | null {
    const fields = STEP_FIELDS[step] ?? [];
    if (fields.length) {
      const result = organizationFormSchema.safeParse(this.model());
      const issue = result.success
        ? undefined
        : result.error.issues.find((i) =>
            fields.includes(i.path[0] as keyof OrganizationFormValue),
          );
      if (issue) return `Complétez cette étape : ${issue.message.toLowerCase()}.`;
    }
    if (step === SERVICES_STEP && !this.serviceIds().length) {
      return 'Choisissez au moins un service.';
    }
    if (step === FILES_STEP && !this.documents().length) {
      return 'Ajoutez au moins un document (registre de commerce, patente…).';
    }
    return null;
  }

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

  /**
   * The organization first; a service that fails afterwards does not undo it (it can be added
   * from the pro space), it is only counted for the success screen.
   */
  protected async send(): Promise<void> {
    const blocked = STEPS.findIndex((_, i) => this.stepProblem(i) !== null);
    if (blocked !== -1) {
      this.step.set(blocked);
      this.error.set(this.stepProblem(blocked));
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    try {
      const organization = await this.saveOrganization.mutateAsync({
        id: null,
        value: organizationFormSchema.parse(this.model()),
      });
      this.createdId.set(organization.id);
      let servicesFailed = 0;
      for (const id of this.serviceIds()) {
        try {
          await this.offer.save.mutateAsync({
            id: null,
            value: {
              serviceId: String(id),
              atHome: this.atHome().includes(id),
              indicativePrice: '',
            },
          });
        } catch {
          servicesFailed++;
        }
      }
      let filesFailed = 0;
      const uploads: (() => Promise<unknown>)[] = [
        ...(this.logo()
          ? [() => this.fileMutations.uploadLogo.mutateAsync(this.logo()!.file)]
          : []),
        ...this.photos().map(
          (staged) => () => this.fileMutations.uploadPhoto.mutateAsync(staged.file),
        ),
        ...this.documents().map(
          (staged) => () => this.fileMutations.uploadDocument.mutateAsync(staged.file),
        ),
      ];
      for (const upload of uploads) {
        try {
          await upload();
        } catch {
          filesFailed++;
        }
      }
      this.submitted.emit({ organization, servicesFailed, filesFailed });
    } catch (error) {
      this.error.set(problemMessage(error, 'Envoi impossible, réessayez.'));
    } finally {
      this.sending.set(false);
    }
  }
}

function stage(file: File): StagedFile {
  return {
    id: nextStagedId++,
    file,
    url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
  };
}

function toItem(staged: StagedFile): DropZoneItem {
  return { id: staged.id, name: staged.file.name, url: staged.url, image: !!staged.url };
}
