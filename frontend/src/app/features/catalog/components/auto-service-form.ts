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
import { Button, FormField, Icon, IconName, inputClasses } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { SERVICE_ICONS, serviceIcon } from '../catalog.icons';
import { injectSaveAutoServiceMutation } from '../catalog.queries';
import { AutoServiceFormValue, autoServiceFormSchema } from '../catalog.schema';
import { AutoService } from '../catalog.types';

const emptyValue: AutoServiceFormValue = { name: '', description: '', active: true, icon: '' };

const toValue = (service: AutoService): AutoServiceFormValue => ({
  name: service.name,
  description: service.description ?? '',
  active: service.active,
  icon: service.icon ?? '',
});

@Component({
  selector: 'app-auto-service-form',
  imports: [Button, FormField, Icon, SignalFormField],
  template: `
    <form class="flex flex-col gap-4" (submit)="save($event)" novalidate>
      <app-form-field label="Nom" controlId="auto-service-name" [field]="serviceForm.name">
        <input
          id="auto-service-name"
          [class]="inputClasses"
          [formField]="serviceForm.name"
          placeholder="Vidange"
        />
      </app-form-field>

      <app-form-field
        label="Description"
        controlId="auto-service-description"
        [field]="serviceForm.description"
      >
        <textarea
          id="auto-service-description"
          [class]="inputClasses + ' h-24 py-2'"
          [formField]="serviceForm.description"
        ></textarea>
      </app-form-field>

      <div class="flex flex-col gap-2">
        <div class="flex items-end justify-between gap-3">
          <div>
            <p class="text-[13px] font-medium text-foreground-secondary">Icône</p>
            <p class="text-caption text-foreground-muted">
              Montrée aux clients dans la recherche, les fiches garage et le diagnostic.
            </p>
          </div>
          <span
            class="flex shrink-0 items-center gap-2 rounded-full border border-border-subtle py-1 pr-3 pl-1 text-body-sm text-foreground"
            aria-label="Aperçu"
          >
            <span class="grid size-8 place-items-center rounded-full bg-primary-subtle text-primary"
              ><svg appIcon [name]="previewIcon()" class="size-4"></svg
            ></span>
            {{ model().name || 'Aperçu' }}
          </span>
        </div>
        <div class="grid grid-cols-6 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="Icône">
          @for (icon of icons; track icon.name) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="isChosen(icon.name)"
              [attr.aria-label]="icon.label"
              [title]="icon.label"
              [class]="iconClass(icon.name)"
              (click)="chooseIcon(icon.name)"
            >
              <svg appIcon [name]="icon.name" class="size-5"></svg>
            </button>
          }
        </div>
        @if (model().icon) {
          <button
            type="button"
            class="self-start text-caption font-semibold text-foreground-secondary hover:text-foreground hover:underline"
            (click)="chooseIcon('')"
          >
            Revenir à l’icône automatique
          </button>
        }
      </div>

      @if (service()) {
        <label class="flex items-center gap-2 text-body-sm">
          <input type="checkbox" class="size-4 accent-primary" [formField]="serviceForm.active" />
          Service actif
        </label>
      }

      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }

      <div class="flex justify-end gap-2">
        <button appButton variant="ghost" type="button" (click)="cancelled.emit()">Annuler</button>
        <!-- Disabled until something changed, and again after a successful save (form is reset). -->
        <button appButton type="submit" [disabled]="!canSubmit()">
          {{ service() ? 'Enregistrer' : 'Ajouter le service' }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoServiceForm {
  readonly service = input<AutoService | null>(null);
  readonly saved = output<AutoService>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly icons = SERVICE_ICONS;
  protected readonly model = signal<AutoServiceFormValue>(emptyValue);
  protected readonly serviceForm = form(this.model, (path) =>
    validateStandardSchema(path, autoServiceFormSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  /** What the client will see: the chosen icon, or the one guessed from the name. */
  protected readonly previewIcon = computed(() =>
    serviceIcon(this.model().name, this.model().icon || null),
  );

  private readonly saveMutation = injectSaveAutoServiceMutation();

  protected readonly canSubmit = computed(
    () =>
      this.serviceForm().dirty() && this.serviceForm().valid() && !this.saveMutation.isPending(),
  );

  constructor() {
    effect(() => {
      const service = this.service();
      this.serviceForm().reset(service ? toValue(service) : emptyValue);
      this.serverError.set(null);
    });
  }

  protected isChosen(icon: IconName): boolean {
    return this.model().icon === icon;
  }

  /** The grid is not a form control, so it marks the field dirty itself. */
  protected chooseIcon(icon: IconName | ''): void {
    this.serviceForm.icon().value.set(icon);
    this.serviceForm.icon().markAsDirty();
  }

  protected iconClass(icon: IconName): string {
    return cn(
      'grid aspect-square place-items-center rounded-xl border-[1.5px] transition-colors',
      this.isChosen(icon)
        ? 'border-accent bg-primary-subtle text-primary'
        : 'border-border-subtle text-foreground-secondary hover:border-border-strong hover:text-foreground',
    );
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.serviceForm, async () => {
      this.serverError.set(null);
      try {
        const saved = await this.saveMutation.mutateAsync({
          id: this.service()?.id ?? null,
          value: autoServiceFormSchema.parse(this.model()),
        });
        this.serviceForm().reset(toValue(saved));
        this.saved.emit(saved);
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
