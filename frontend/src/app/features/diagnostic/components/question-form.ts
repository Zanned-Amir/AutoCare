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
import { injectDiagnosticAdminMutations } from '../diagnostic.queries';
import { QuestionValue, questionSchema, splitOptions } from '../diagnostic.schema';
import { ANSWER_TYPES, Question, answerTypeLabels } from '../diagnostic.types';

const toValue = (question: Question | null, position: number): QuestionValue => ({
  text: question?.text ?? '',
  answerType: question?.answerType ?? 'YES_NO',
  options: question?.options.join('\n') ?? '',
  position: question?.position ?? position,
});

@Component({
  selector: 'app-question-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]" (submit)="save($event)" novalidate>
      <app-form-field label="Question" controlId="question-text" [field]="questionForm.text">
        <input id="question-text" [class]="inputClasses" [formField]="questionForm.text" />
      </app-form-field>
      <app-form-field label="Réponse" controlId="question-type" [field]="questionForm.answerType">
        <app-select id="question-type" [formField]="questionForm.answerType">
          @for (type of answerTypes; track type) {
            <app-option [value]="type">{{ answerTypeLabels[type] }}</app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field label="Ordre" controlId="question-position" [field]="questionForm.position">
        <input
          id="question-position"
          type="number"
          [class]="inputClasses"
          [formField]="questionForm.position"
        />
      </app-form-field>
      @if (model().answerType === 'SINGLE_CHOICE' || model().answerType === 'MULTIPLE_CHOICE') {
        <app-form-field
          label="Choix (un par ligne)"
          controlId="question-options"
          [field]="questionForm.options"
          class="sm:col-span-3"
        >
          <textarea
            id="question-options"
            [class]="inputClasses + ' h-24 py-2'"
            [formField]="questionForm.options"
          ></textarea>
        </app-form-field>
      }
      @if (serverError(); as message) {
        <p class="text-body-sm text-error sm:col-span-3">{{ message }}</p>
      }
      <div class="flex justify-end gap-2 sm:col-span-3">
        <button appButton variant="ghost" size="sm" type="button" (click)="cancelled.emit()">
          Annuler
        </button>
        <button appButton size="sm" type="submit" [disabled]="!canSubmit()">Enregistrer</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionForm {
  readonly symptomId = input.required<number>();
  readonly question = input<Question | null>(null);
  readonly nextPosition = input(0);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly answerTypes = ANSWER_TYPES;
  protected readonly answerTypeLabels = answerTypeLabels;
  protected readonly model = signal<QuestionValue>(toValue(null, 0));
  protected readonly questionForm = form(this.model, (path) =>
    validateStandardSchema(path, questionSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  private readonly mutations = injectDiagnosticAdminMutations(() => this.symptomId());
  protected readonly canSubmit = computed(
    () =>
      this.questionForm().dirty() &&
      this.questionForm().valid() &&
      !this.mutations.saveQuestion.isPending(),
  );

  constructor() {
    effect(() => {
      this.questionForm().reset(toValue(this.question(), this.nextPosition()));
      this.serverError.set(null);
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.questionForm, async () => {
      try {
        const value = questionSchema.parse(this.model());
        await this.mutations.saveQuestion.mutateAsync({
          id: this.question()?.id ?? null,
          body: { ...value, options: splitOptions(value.options) },
        });
        this.questionForm().reset(value);
        this.saved.emit();
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
