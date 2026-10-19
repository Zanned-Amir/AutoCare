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
import { Button, FormField, inputClasses } from '@shared/ui';
import { injectDiagnosticAdminMutations } from '../diagnostic.queries';
import { SymptomValue, symptomSchema } from '../diagnostic.schema';
import { Symptom } from '../diagnostic.types';

const toValue = (symptom: Symptom | null): SymptomValue => ({
  label: symptom?.label ?? '',
  description: symptom?.description ?? '',
  position: symptom?.position ?? 0,
  active: symptom?.active ?? true,
});

@Component({
  selector: 'app-symptom-form',
  imports: [Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-3 sm:grid-cols-[2fr_1fr]" (submit)="save($event)" novalidate>
      <app-form-field label="Symptôme" controlId="symptom-label" [field]="symptomForm.label">
        <input id="symptom-label" [class]="inputClasses" [formField]="symptomForm.label" />
      </app-form-field>
      <app-form-field label="Ordre" controlId="symptom-position" [field]="symptomForm.position">
        <input
          id="symptom-position"
          type="number"
          [class]="inputClasses"
          [formField]="symptomForm.position"
        />
      </app-form-field>
      <app-form-field
        label="Description"
        controlId="symptom-description"
        [field]="symptomForm.description"
        class="sm:col-span-2"
      >
        <input
          id="symptom-description"
          [class]="inputClasses"
          [formField]="symptomForm.description"
        />
      </app-form-field>
      <label class="flex items-center gap-2 text-body-sm">
        <input type="checkbox" class="size-4 accent-primary" [formField]="symptomForm.active" />
        Proposé aux clients
      </label>
      @if (serverError(); as message) {
        <p class="text-body-sm text-error sm:col-span-2">{{ message }}</p>
      }
      <div class="flex justify-end gap-2 sm:col-span-2">
        @if (!symptom()) {
          <button appButton variant="ghost" type="button" (click)="cancelled.emit()">
            Annuler
          </button>
        }
        <button appButton type="submit" [disabled]="!canSubmit()">
          {{ symptom() ? 'Enregistrer' : 'Créer' }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymptomForm {
  readonly symptom = input<Symptom | null>(null);
  readonly saved = output<Symptom>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<SymptomValue>(toValue(null));
  protected readonly symptomForm = form(this.model, (path) =>
    validateStandardSchema(path, symptomSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  private readonly mutations = injectDiagnosticAdminMutations(() => this.symptom()?.id ?? null);
  protected readonly canSubmit = computed(
    () =>
      this.symptomForm().dirty() &&
      this.symptomForm().valid() &&
      !this.mutations.saveSymptom.isPending(),
  );

  constructor() {
    effect(() => {
      this.symptomForm().reset(toValue(this.symptom()));
      this.serverError.set(null);
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.symptomForm, async () => {
      try {
        const value = symptomSchema.parse(this.model());
        const saved = await this.mutations.saveSymptom.mutateAsync({
          id: this.symptom()?.id ?? null,
          body: { ...value, description: value.description.trim() || null },
        });
        this.symptomForm().reset(toValue(saved));
        this.saved.emit(saved);
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
