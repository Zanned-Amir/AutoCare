import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { DiagnosticApi, QuestionBody, RuleBody, SymptomBody } from './diagnostic.api';
import { AnswerValue } from './diagnostic.types';

export const diagnosticKeys = {
  all: ['diagnostic'] as const,
  symptoms: () => [...diagnosticKeys.all, 'symptoms'] as const,
  questions: (symptomId: number) => [...diagnosticKeys.all, 'questions', symptomId] as const,
  mine: (page: number) => [...diagnosticKeys.all, 'mine', page] as const,
  adminSymptoms: () => [...diagnosticKeys.all, 'admin', 'symptoms'] as const,
  flow: (symptomId: number) => [...diagnosticKeys.all, 'admin', 'flow', symptomId] as const,
};

export function injectSymptomsQuery() {
  const api = inject(DiagnosticApi);
  return injectQuery(() => ({
    queryKey: diagnosticKeys.symptoms(),
    queryFn: () => api.listSymptoms(),
  }));
}

export function injectSymptomQuestionsQuery(symptomId: () => number | null) {
  const api = inject(DiagnosticApi);
  return injectQuery(() => ({
    queryKey: diagnosticKeys.questions(symptomId() ?? 0),
    queryFn: () => api.getSymptomQuestions(symptomId()!),
    enabled: symptomId() !== null,
  }));
}

export function injectMyDiagnosticsQuery(page: () => number) {
  const api = inject(DiagnosticApi);
  return injectQuery(() => ({
    queryKey: diagnosticKeys.mine(page()),
    queryFn: () => api.listMyDiagnostics(page()),
  }));
}

export function injectRunDiagnosticMutation() {
  const api = inject(DiagnosticApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (v: {
      symptomId: number;
      vehicleId: number | null;
      answers: Record<number, AnswerValue>;
    }) => api.runDiagnostic(v.symptomId, v.vehicleId, v.answers),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...diagnosticKeys.all, 'mine'] }),
  }));
}

export function injectAdminSymptomsQuery() {
  const api = inject(DiagnosticApi);
  return injectQuery(() => ({
    queryKey: diagnosticKeys.adminSymptoms(),
    queryFn: () => api.listAllSymptoms(),
  }));
}

export function injectSymptomFlowQuery(symptomId: () => number | null) {
  const api = inject(DiagnosticApi);
  return injectQuery(() => ({
    queryKey: diagnosticKeys.flow(symptomId() ?? 0),
    queryFn: () => api.getSymptomFlow(symptomId()!),
    enabled: symptomId() !== null,
  }));
}

/** Every backoffice change can alter what clients see, so the whole feature is refreshed. */
export function injectDiagnosticAdminMutations(symptomId: () => number | null) {
  const api = inject(DiagnosticApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: diagnosticKeys.all });
  return {
    saveSymptom: injectMutation(() => ({
      mutationFn: (v: { id: number | null; body: SymptomBody }) => api.saveSymptom(v.id, v.body),
      onSuccess,
    })),
    saveQuestion: injectMutation(() => ({
      mutationFn: (v: { id: number | null; body: QuestionBody }) =>
        api.saveQuestion(symptomId()!, v.id, v.body),
      onSuccess,
    })),
    deleteQuestion: injectMutation(() => ({
      mutationFn: (id: number) => api.deleteQuestion(symptomId()!, id),
      onSuccess,
    })),
    saveRule: injectMutation(() => ({
      mutationFn: (v: { id: number | null; body: RuleBody }) =>
        api.saveRule(symptomId()!, v.id, v.body),
      onSuccess,
    })),
    deleteRule: injectMutation(() => ({
      mutationFn: (id: number) => api.deleteRule(symptomId()!, id),
      onSuccess,
    })),
  };
}
