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
import { injectDiagnosticAdminMutations } from '../diagnostic.queries';
import { RuleValue, ruleSchema } from '../diagnostic.schema';
import {
  ConditionOperator,
  Question,
  Rule,
  RuleCondition,
  URGENCIES,
  urgencyLabels,
} from '../diagnostic.types';

const toValue = (rule: Rule | null): RuleValue => ({
  name: rule?.name ?? '',
  priority: rule?.priority ?? 10,
  possibleCause: rule?.possibleCause ?? '',
  recommendation: rule?.recommendation ?? '',
  serviceId: rule?.serviceId ? String(rule.serviceId) : '',
  urgency: rule?.urgency ?? 'MEDIUM',
});

/** The operator follows the question type; only numbers let the admin choose (≥ or ≤). */
function defaultCondition(question: Question): RuleCondition {
  switch (question.answerType) {
    case 'YES_NO':
      return { questionId: question.id, operator: 'EQUALS', value: 'true' };
    case 'SINGLE_CHOICE':
      return { questionId: question.id, operator: 'EQUALS', value: question.options[0] ?? '' };
    case 'MULTIPLE_CHOICE':
      return { questionId: question.id, operator: 'INCLUDES', value: question.options[0] ?? '' };
    case 'NUMBER':
      return { questionId: question.id, operator: 'AT_LEAST', value: '0' };
  }
}

@Component({
  selector: 'app-rule-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]" (submit)="save($event)" novalidate>
      <app-form-field label="Nom (interne)" controlId="rule-name" [field]="ruleForm.name">
        <input id="rule-name" [class]="inputClasses" [formField]="ruleForm.name" />
      </app-form-field>
      <app-form-field label="Priorité" controlId="rule-priority" [field]="ruleForm.priority">
        <input
          id="rule-priority"
          type="number"
          [class]="inputClasses"
          [formField]="ruleForm.priority"
        />
      </app-form-field>
      <app-form-field label="Urgence" controlId="rule-urgency" [field]="ruleForm.urgency">
        <app-select id="rule-urgency" [formField]="ruleForm.urgency">
          @for (urgency of urgencies; track urgency) {
            <app-option [value]="urgency">{{ urgencyLabels[urgency] }}</app-option>
          }
        </app-select>
      </app-form-field>

      <fieldset
        class="flex flex-col gap-2 rounded-control border border-border-subtle p-3 sm:col-span-3"
      >
        <legend class="px-1 text-label">
          Conditions (toutes doivent être vraies, aucune = règle par défaut)
        </legend>
        @for (condition of conditions(); track $index) {
          <div class="flex flex-wrap items-center gap-2">
            <app-select
              aria-label="Question"
              class="sm:w-72"
              (valueChange)="changeQuestion($index, $event)"
            >
              @for (question of questions(); track question.id) {
                <app-option [value]="question.id" [selected]="question.id === condition.questionId">
                  {{ question.text }}
                </app-option>
              }
            </app-select>
            @switch (questionOf(condition)?.answerType) {
              @case ('NUMBER') {
                <app-select
                  aria-label="Opérateur"
                  class="w-24"
                  (valueChange)="patch($index, { operator: $event })"
                >
                  <app-option value="AT_LEAST" [selected]="condition.operator === 'AT_LEAST'"
                    >≥</app-option
                  >
                  <app-option value="AT_MOST" [selected]="condition.operator === 'AT_MOST'"
                    >≤</app-option
                  >
                </app-select>
                <input
                  aria-label="Valeur"
                  type="number"
                  min="0"
                  [class]="inputClasses + ' w-32'"
                  [value]="condition.value"
                  (input)="patch($index, { value: $any($event.target).value })"
                />
              }
              @case ('YES_NO') {
                <app-select
                  aria-label="Valeur"
                  class="w-32"
                  (valueChange)="patch($index, { value: $event })"
                >
                  <app-option value="true" [selected]="condition.value === 'true'">Oui</app-option>
                  <app-option value="false" [selected]="condition.value === 'false'"
                    >Non</app-option
                  >
                </app-select>
              }
              @default {
                <span class="text-body-sm text-foreground-secondary">{{
                  condition.operator === 'INCLUDES' ? 'contient' : '='
                }}</span>
                <app-select
                  aria-label="Valeur"
                  class="sm:w-56"
                  (valueChange)="patch($index, { value: $event })"
                >
                  @for (option of questionOf(condition)?.options ?? []; track option) {
                    <app-option [value]="option" [selected]="option === condition.value">
                      {{ option }}
                    </app-option>
                  }
                </app-select>
              }
            }
            <button
              appButton
              variant="ghost"
              size="sm"
              type="button"
              (click)="removeCondition($index)"
            >
              Retirer
            </button>
          </div>
        }
        @if (questions().length > 0) {
          <button
            appButton
            variant="secondary"
            size="sm"
            type="button"
            class="self-start"
            (click)="addCondition()"
          >
            Ajouter une condition
          </button>
        }
      </fieldset>

      <app-form-field
        label="Cause probable"
        controlId="rule-cause"
        [field]="ruleForm.possibleCause"
        class="sm:col-span-3"
      >
        <input id="rule-cause" [class]="inputClasses" [formField]="ruleForm.possibleCause" />
      </app-form-field>
      <app-form-field
        label="Recommandation"
        controlId="rule-recommendation"
        [field]="ruleForm.recommendation"
        class="sm:col-span-2"
      >
        <textarea
          id="rule-recommendation"
          [class]="inputClasses + ' h-20 py-2'"
          [formField]="ruleForm.recommendation"
        ></textarea>
      </app-form-field>
      <app-form-field label="Service suggéré" controlId="rule-service" [field]="ruleForm.serviceId">
        <app-select id="rule-service" [formField]="ruleForm.serviceId">
          <app-option value="">Aucun</app-option>
          @for (service of services.data() ?? []; track service.id) {
            <app-option [value]="'' + service.id">{{ service.name }}</app-option>
          }
        </app-select>
      </app-form-field>
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
export class RuleForm {
  readonly symptomId = input.required<number>();
  readonly questions = input.required<Question[]>();
  readonly rule = input<Rule | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly urgencies = URGENCIES;
  protected readonly urgencyLabels = urgencyLabels;
  protected readonly services = injectActiveAutoServicesQuery();
  protected readonly model = signal<RuleValue>(toValue(null));
  protected readonly ruleForm = form(this.model, (path) =>
    validateStandardSchema(path, ruleSchema),
  );
  /** Conditions are edited outside Signal Forms (a dynamic list); dirty is a comparison with the saved list. */
  protected readonly conditions = signal<RuleCondition[]>([]);
  private readonly savedConditions = signal<string>('[]');
  protected readonly serverError = signal<string | null>(null);
  private readonly mutations = injectDiagnosticAdminMutations(() => this.symptomId());
  protected readonly canSubmit = computed(
    () =>
      (this.ruleForm().dirty() || JSON.stringify(this.conditions()) !== this.savedConditions()) &&
      this.ruleForm().valid() &&
      this.conditions().every((c) => c.value !== '') &&
      !this.mutations.saveRule.isPending(),
  );

  constructor() {
    effect(() => {
      const rule = this.rule();
      this.ruleForm().reset(toValue(rule));
      this.conditions.set(rule?.conditions.map((c) => ({ ...c })) ?? []);
      this.savedConditions.set(JSON.stringify(this.conditions()));
      this.serverError.set(null);
    });
  }

  protected questionOf(condition: RuleCondition): Question | undefined {
    return this.questions().find((q) => q.id === condition.questionId);
  }

  protected addCondition(): void {
    const first = this.questions()[0];
    if (first) this.conditions.update((list) => [...list, defaultCondition(first)]);
  }

  protected removeCondition(index: number): void {
    this.conditions.update((list) => list.filter((_, i) => i !== index));
  }

  protected changeQuestion(index: number, questionId: string): void {
    const question = this.questions().find((q) => q.id === Number(questionId));
    if (question)
      this.conditions.update((list) =>
        list.map((c, i) => (i === index ? defaultCondition(question) : c)),
      );
  }

  protected patch(index: number, change: { operator?: ConditionOperator; value?: string }): void {
    this.conditions.update((list) => list.map((c, i) => (i === index ? { ...c, ...change } : c)));
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.ruleForm, async () => {
      try {
        const value = ruleSchema.parse(this.model());
        await this.mutations.saveRule.mutateAsync({
          id: this.rule()?.id ?? null,
          body: {
            name: value.name,
            priority: value.priority,
            possibleCause: value.possibleCause,
            recommendation: value.recommendation,
            serviceId: value.serviceId ? Number(value.serviceId) : null,
            urgency: value.urgency,
            conditions: this.conditions(),
          },
        });
        this.ruleForm().reset(value);
        this.savedConditions.set(JSON.stringify(this.conditions()));
        this.saved.emit();
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
