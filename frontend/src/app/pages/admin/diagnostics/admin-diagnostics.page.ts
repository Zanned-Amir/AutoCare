import { ChangeDetectionStrategy, Component, computed, linkedSignal, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { QuestionForm } from '@features/diagnostic/components/question-form';
import { RuleForm } from '@features/diagnostic/components/rule-form';
import { SymptomForm } from '@features/diagnostic/components/symptom-form';
import {
  injectAdminSymptomsQuery,
  injectDiagnosticAdminMutations,
  injectSymptomFlowQuery,
} from '@features/diagnostic/diagnostic.queries';
import {
  Question,
  Rule,
  RuleCondition,
  answerTypeLabels,
  urgencyTones,
} from '@features/diagnostic/diagnostic.types';
import { Badge, Button, Card, Spinner } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

const operatorText: Record<RuleCondition['operator'], string> = {
  EQUALS: '=',
  INCLUDES: 'contient',
  AT_LEAST: '≥',
  AT_MOST: '≤',
};

/** Symptoms on the left; questions and rules of the selected one on the right. */
@Component({
  selector: 'app-admin-diagnostics-page',
  imports: [AdminPageHeader, Badge, Button, Card, QuestionForm, RuleForm, Spinner, SymptomForm],
  template: `
    <app-admin-page-header
      title="Symptômes et règles"
      subtitle="Le diagnostic guidé : symptômes, questions posées au client et règles de résultat."
    ></app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <div class="grid gap-6 lg:grid-cols-[1fr_3fr]">
        <aside class="flex flex-col gap-2">
          @for (symptom of symptoms.data() ?? []; track symptom.id) {
            <button
              type="button"
              [class]="symptomClass(symptom.id)"
              (click)="selectedId.set(symptom.id); creating.set(false)"
            >
              <span class="text-label">{{ symptom.label }}</span>
              @if (!symptom.active) {
                <app-badge>Masqué</app-badge>
              }
            </button>
          }
          <button
            appButton
            variant="secondary"
            size="sm"
            type="button"
            (click)="creating.set(true)"
          >
            Nouveau symptôme
          </button>
        </aside>

        <div class="flex flex-col gap-6">
          @if (creating()) {
            <app-card>
              <h2 class="mb-3 text-h4">Nouveau symptôme</h2>
              <app-symptom-form
                (saved)="selectedId.set($event.id); creating.set(false)"
                (cancelled)="creating.set(false)"
              />
            </app-card>
          } @else if (flow.isPending() && selectedId() !== null) {
            <app-spinner />
          } @else if (flow.data(); as current) {
            <app-card>
              <app-symptom-form [symptom]="current.symptom" />
            </app-card>

            <app-card class="p-0">
              <div class="flex items-center justify-between border-b border-border-subtle p-4">
                <h2 class="text-h4">Questions</h2>
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  (click)="editingQuestion.set('new')"
                >
                  Ajouter
                </button>
              </div>
              @if (editingQuestion(); as question) {
                <div class="border-b border-border-subtle p-4">
                  <app-question-form
                    [symptomId]="current.symptom.id"
                    [question]="question === 'new' ? null : question"
                    [nextPosition]="current.questions.length"
                    (saved)="editingQuestion.set(null)"
                    (cancelled)="editingQuestion.set(null)"
                  />
                </div>
              }
              <ol class="divide-y divide-border-subtle">
                @for (question of current.questions; track question.id) {
                  <li class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <p class="text-label">{{ question.position + 1 }}. {{ question.text }}</p>
                      <p class="text-caption text-foreground-muted">
                        {{ answerTypeLabels[question.answerType] }}
                        @if (question.options.length) {
                          : {{ question.options.join(' · ') }}
                        }
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="editingQuestion.set(question)"
                      >
                        Modifier
                      </button>
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="removeQuestion(question)"
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                } @empty {
                  <li class="px-4 py-3 text-body-sm text-foreground-muted">Aucune question.</li>
                }
              </ol>
            </app-card>

            <app-card class="p-0">
              <div class="flex items-center justify-between border-b border-border-subtle p-4">
                <div>
                  <h2 class="text-h4">Règles</h2>
                  <p class="text-caption text-foreground-muted">
                    La règle qui correspond avec la plus haute priorité gagne.
                  </p>
                </div>
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  (click)="editingRule.set('new')"
                >
                  Ajouter
                </button>
              </div>
              @if (editingRule(); as rule) {
                <div class="border-b border-border-subtle p-4">
                  <app-rule-form
                    [symptomId]="current.symptom.id"
                    [questions]="current.questions"
                    [rule]="rule === 'new' ? null : rule"
                    (saved)="editingRule.set(null)"
                    (cancelled)="editingRule.set(null)"
                  />
                </div>
              }
              <ul class="divide-y divide-border-subtle">
                @for (rule of current.rules; track rule.id) {
                  <li class="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                    <div class="min-w-0">
                      <p class="flex flex-wrap items-center gap-2 text-label">
                        <span class="text-plate text-foreground-muted">P{{ rule.priority }}</span>
                        {{ rule.name }}
                        <app-badge [tone]="urgencyTones[rule.urgency]">{{
                          rule.possibleCause
                        }}</app-badge>
                      </p>
                      <p class="text-caption text-foreground-muted">
                        @for (condition of rule.conditions; track $index) {
                          {{ $index ? ' et ' : 'Si ' }}«
                          {{ questionText(current.questions, condition.questionId) }} »
                          {{ operatorText[condition.operator] }} {{ display(condition.value) }}
                        } @empty {
                          Règle par défaut (toujours vraie)
                        }
                        @if (rule.serviceName) {
                          → {{ rule.serviceName }}
                        }
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="editingRule.set(rule)"
                      >
                        Modifier
                      </button>
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="mutations.deleteRule.mutate(rule.id)"
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                } @empty {
                  <li class="px-4 py-3 text-body-sm text-foreground-muted">
                    Aucune règle : le client verra « pas de cause évidente ».
                  </li>
                }
              </ul>
            </app-card>
            @if (error(); as message) {
              <p class="text-body-sm text-error">{{ message }}</p>
            }
          } @else {
            <app-card
              ><p class="text-body-sm text-foreground-secondary">
                Choisissez un symptôme.
              </p></app-card
            >
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDiagnosticsPage {
  protected readonly answerTypeLabels = answerTypeLabels;
  protected readonly urgencyTones = urgencyTones;
  protected readonly operatorText = operatorText;
  protected readonly symptoms = injectAdminSymptomsQuery();
  /** First symptom by default; keeps the choice when the list reloads. */
  protected readonly selectedId = linkedSignal<number | null>(
    () => this.symptoms.data()?.[0]?.id ?? null,
  );
  protected readonly creating = signal(false);
  protected readonly flow = injectSymptomFlowQuery(() => this.selectedId());
  protected readonly mutations = injectDiagnosticAdminMutations(() => this.selectedId());
  protected readonly editingQuestion = linkedSignal<number | null, Question | 'new' | null>({
    source: this.selectedId,
    computation: () => null,
  });
  protected readonly editingRule = linkedSignal<number | null, Rule | 'new' | null>({
    source: this.selectedId,
    computation: () => null,
  });
  protected readonly error = signal<string | null>(null);
  protected readonly hasSymptoms = computed(() => (this.symptoms.data()?.length ?? 0) > 0);

  protected removeQuestion(question: Question): void {
    this.error.set(null);
    this.mutations.deleteQuestion.mutate(question.id, {
      onError: (e) => this.error.set(problemMessage(e, 'Suppression impossible')),
    });
  }

  protected questionText(questions: Question[], id: number): string {
    return questions.find((q) => q.id === id)?.text ?? '?';
  }

  protected display(value: string): string {
    return value === 'true' ? 'oui' : value === 'false' ? 'non' : value;
  }

  protected symptomClass(id: number): string {
    return cn(
      'flex items-center justify-between gap-2 rounded-control border px-3 py-2 text-left',
      this.selectedId() === id && !this.creating()
        ? 'border-primary bg-primary-subtle text-primary'
        : 'border-border-subtle bg-surface text-foreground hover:border-primary',
    );
  }
}
