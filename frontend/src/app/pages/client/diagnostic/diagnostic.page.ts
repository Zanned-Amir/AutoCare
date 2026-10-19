import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';

import { problemMessage } from '@core/api/api';
import { DiagnosticResultCard } from '@features/diagnostic/components/diagnostic-result-card';
import {
  injectMyDiagnosticsQuery,
  injectRunDiagnosticMutation,
  injectSymptomQuestionsQuery,
  injectSymptomsQuery,
} from '@features/diagnostic/diagnostic.queries';
import {
  AnswerValue,
  DiagnosticResult,
  Question,
  urgencyTones,
} from '@features/diagnostic/diagnostic.types';
import { injectMyVehiclesQuery } from '@features/vehicles/vehicles.queries';
import { Badge, Button, Card, Icon, Spinner, inputClasses } from '@shared/ui';
import { cn } from '@shared/utils/cn';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

/** Symptom, then one question at a time, then the result. Wizard state lives in the page only. */
@Component({
  selector: 'app-diagnostic-page',
  imports: [Badge, Button, Card, DiagnosticResultCard, Icon, Spinner],
  template: `
    <span class="text-overline text-accent-text">Diagnostic guidé</span>
    <h1 class="text-h2 text-primary">Que se passe-t-il avec votre voiture ?</h1>

    <div class="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        @if (result(); as done) {
          <app-diagnostic-result-card [result]="done" />
          <button appButton variant="ghost" class="mt-3" type="button" (click)="restart()">
            Nouveau diagnostic
          </button>
        } @else if (symptomId() === null) {
          @if (vehicles.data()?.length) {
            <div class="mb-6">
              <p class="text-overline text-foreground-muted">Véhicule concerné (optionnel)</p>
              <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Véhicule">
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="vehicleChoice() === null"
                  [class]="chipClass(vehicleChoice() === null)"
                  (click)="vehicleChoice.set(null)"
                >
                  Aucun en particulier
                </button>
                @for (vehicle of vehicles.data() ?? []; track vehicle.id) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="vehicle.id === vehicleChoice()"
                    [class]="chipClass(vehicle.id === vehicleChoice())"
                    (click)="vehicleChoice.set(vehicle.id)"
                  >
                    <svg appIcon name="car" class="size-4"></svg>
                    {{ vehicle.brand }} {{ vehicle.model }}
                    <span class="opacity-70">{{ vehicle.year }}</span>
                  </button>
                }
              </div>
            </div>
          }
          <p class="mb-2 text-overline text-foreground-muted">Symptôme</p>
          @if (symptoms.isPending()) {
            <app-spinner />
          } @else {
            <div class="grid gap-3 sm:grid-cols-2">
              @for (symptom of symptoms.data() ?? []; track symptom.id) {
                <button
                  type="button"
                  class="rounded-card border border-border-subtle bg-surface p-4 text-left shadow-card transition hover:border-primary"
                  (click)="chooseSymptom(symptom.id)"
                >
                  <span class="text-h4 text-foreground">{{ symptom.label }}</span>
                  @if (symptom.description; as description) {
                    <span class="mt-1 block text-body-sm text-foreground-secondary">{{
                      description
                    }}</span>
                  }
                </button>
              }
            </div>
          }
        } @else if (flow.isPending()) {
          <app-spinner />
        } @else if (currentQuestion(); as question) {
          <app-card>
            <div class="flex items-center justify-between text-caption text-foreground-muted">
              <span>{{ flow.data()?.symptom?.label }}</span>
              <span>Question {{ step() + 1 }} / {{ questions().length }}</span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                class="h-full bg-primary transition-all"
                [style.width.%]="((step() + 1) / questions().length) * 100"
              ></div>
            </div>
            <h2 class="mt-4 text-h3 text-foreground">{{ question.text }}</h2>

            <div class="mt-4 flex flex-wrap gap-2">
              @switch (question.answerType) {
                @case ('YES_NO') {
                  <button
                    appButton
                    type="button"
                    [variant]="answers()[question.id] === true ? 'primary' : 'secondary'"
                    (click)="answer(question, true, true)"
                  >
                    Oui
                  </button>
                  <button
                    appButton
                    type="button"
                    [variant]="answers()[question.id] === false ? 'primary' : 'secondary'"
                    (click)="answer(question, false, true)"
                  >
                    Non
                  </button>
                }
                @case ('SINGLE_CHOICE') {
                  @for (option of question.options; track option) {
                    <button
                      appButton
                      type="button"
                      [variant]="answers()[question.id] === option ? 'primary' : 'secondary'"
                      (click)="answer(question, option, true)"
                    >
                      {{ option }}
                    </button>
                  }
                }
                @case ('MULTIPLE_CHOICE') {
                  @for (option of question.options; track option) {
                    <button
                      type="button"
                      [attr.aria-pressed]="isChecked(question, option)"
                      [class]="chipClass(isChecked(question, option))"
                      (click)="toggle(question, option)"
                    >
                      @if (isChecked(question, option)) {
                        <svg appIcon name="check" class="size-4"></svg>
                      }
                      {{ option }}
                    </button>
                  }
                }
                @case ('NUMBER') {
                  <input
                    type="number"
                    min="0"
                    inputmode="numeric"
                    [class]="inputClasses + ' max-w-48'"
                    [value]="answers()[question.id] ?? ''"
                    (input)="answer(question, toNumber($any($event.target).value), false)"
                  />
                }
              }
            </div>

            @if (error(); as message) {
              <p class="mt-3 text-body-sm text-error">{{ message }}</p>
            }
            <div class="mt-6 flex justify-between gap-2 border-t border-border-subtle pt-3">
              <button appButton variant="ghost" type="button" (click)="back()">Retour</button>
              @if (question.answerType === 'MULTIPLE_CHOICE' || question.answerType === 'NUMBER') {
                <button
                  appButton
                  type="button"
                  [disabled]="!isAnswered(question) || run.isPending()"
                  (click)="next()"
                >
                  {{ isLast() ? 'Voir le résultat' : 'Suivant' }}
                </button>
              }
            </div>
          </app-card>
        }
      </div>

      <aside>
        <h2 class="text-h4">Mes diagnostics</h2>
        <ul class="mt-3 flex flex-col gap-2">
          @for (past of history.data()?.content ?? []; track past.id) {
            <li>
              <button type="button" [class]="historyClass(past)" (click)="result.set(past)">
                <span class="text-label text-foreground">{{ past.symptomLabel }}</span>
                <span class="text-caption text-foreground-muted">{{
                  formatDate(past.createdAt)
                }}</span>
                @if (past.urgency; as urgency) {
                  <app-badge [tone]="urgencyTones[urgency]" class="mt-1 self-start">{{
                    past.possibleCause
                  }}</app-badge>
                }
              </button>
            </li>
          } @empty {
            <li class="text-body-sm text-foreground-muted">Aucun diagnostic pour l'instant.</li>
          }
        </ul>
      </aside>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticPage {
  /** Query param from the vehicle page. */
  readonly vehicleId = input<string>();

  protected readonly inputClasses = inputClasses;
  protected readonly urgencyTones = urgencyTones;
  protected readonly vehicles = injectMyVehiclesQuery();
  protected readonly symptoms = injectSymptomsQuery();
  protected readonly history = injectMyDiagnosticsQuery(() => 0);
  protected readonly run = injectRunDiagnosticMutation();

  protected readonly vehicleChoice = linkedSignal(() => this.toId(this.vehicleId() ?? ''));
  protected readonly symptomId = signal<number | null>(null);
  protected readonly flow = injectSymptomQuestionsQuery(() => this.symptomId());
  protected readonly questions = computed(() => this.flow.data()?.questions ?? []);
  protected readonly step = signal(0);
  protected readonly answers = signal<Record<number, AnswerValue>>({});
  protected readonly currentQuestion = computed<Question | undefined>(
    () => this.questions()[this.step()],
  );
  protected readonly isLast = computed(() => this.step() === this.questions().length - 1);
  protected readonly result = signal<DiagnosticResult | null>(null);
  protected readonly error = signal<string | null>(null);

  protected chooseSymptom(id: number): void {
    this.symptomId.set(id);
    this.step.set(0);
    this.answers.set({});
    this.error.set(null);
  }

  /** Yes/no and single choices move on by themselves. */
  protected answer(question: Question, value: AnswerValue | null, advance: boolean): void {
    this.answers.update((all) => {
      const next = { ...all };
      if (value === null) delete next[question.id];
      else next[question.id] = value;
      return next;
    });
    if (advance) this.next();
  }

  protected toggle(question: Question, option: string): void {
    const current = (this.answers()[question.id] as string[] | undefined) ?? [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    this.answer(question, next, false);
  }

  protected isChecked(question: Question, option: string): boolean {
    return ((this.answers()[question.id] as string[] | undefined) ?? []).includes(option);
  }

  protected isAnswered(question: Question): boolean {
    return this.answers()[question.id] !== undefined;
  }

  protected next(): void {
    if (!this.isLast()) {
      this.step.update((s) => s + 1);
      return;
    }
    this.error.set(null);
    this.run.mutate(
      { symptomId: this.symptomId()!, vehicleId: this.vehicleChoice(), answers: this.answers() },
      {
        onSuccess: (result) => this.result.set(result),
        onError: (e) => this.error.set(problemMessage(e, 'Diagnostic impossible')),
      },
    );
  }

  protected back(): void {
    if (this.step() === 0) this.symptomId.set(null);
    else this.step.update((s) => s - 1);
  }

  protected restart(): void {
    this.result.set(null);
    this.symptomId.set(null);
  }

  protected toId(value: string): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  protected toNumber(value: string): number | null {
    return value === '' || Number.isNaN(Number(value)) || Number(value) < 0 ? null : Number(value);
  }

  protected formatDate(value: string): string {
    return dateFormat.format(new Date(value));
  }

  protected chipClass(active: boolean): string {
    return cn(
      'flex h-10 items-center gap-2 rounded-full border px-4 text-body-sm transition-colors',
      active
        ? 'border-primary bg-primary font-semibold text-primary-foreground'
        : 'border-border bg-surface text-foreground hover:border-border-strong',
    );
  }

  protected historyClass(past: DiagnosticResult): string {
    return cn(
      'flex w-full flex-col rounded-control border px-3 py-2 text-left hover:border-primary',
      this.result()?.id === past.id
        ? 'border-primary bg-primary-subtle'
        : 'border-border-subtle bg-surface',
    );
  }
}
