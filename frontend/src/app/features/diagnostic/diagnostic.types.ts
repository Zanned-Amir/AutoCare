import { BadgeTone } from '@shared/ui';

export { DiagnosticPermissions } from './diagnostic.permissions';

export const ANSWER_TYPES = ['YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'NUMBER'] as const;
export type AnswerType = (typeof ANSWER_TYPES)[number];
export const URGENCIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Urgency = (typeof URGENCIES)[number];
export type ConditionOperator = 'EQUALS' | 'INCLUDES' | 'AT_LEAST' | 'AT_MOST';

export interface Symptom {
  id: number;
  label: string;
  description: string | null;
  position: number;
  active: boolean;
}

export interface Question {
  id: number;
  symptomId: number;
  text: string;
  answerType: AnswerType;
  options: string[];
  position: number;
}

export interface RuleCondition {
  questionId: number;
  operator: ConditionOperator;
  value: string;
}

export interface Rule {
  id: number;
  symptomId: number;
  name: string;
  conditions: RuleCondition[];
  priority: number;
  possibleCause: string;
  recommendation: string;
  serviceId: number | null;
  serviceName: string | null;
  urgency: Urgency;
}

export interface SymptomFlow {
  symptom: Symptom;
  questions: Question[];
  rules: Rule[];
}

/** A yes/no answer is a boolean, a choice a string, several choices a list, a number a number. */
export type AnswerValue = boolean | string | string[] | number;

export interface DiagnosticResult {
  id: number;
  symptomId: number;
  symptomLabel: string | null;
  vehicleId: number | null;
  matched: boolean;
  possibleCause: string | null;
  recommendation: string | null;
  urgency: Urgency | null;
  suggestedService: { id: number; name: string } | null;
  createdAt: string;
}

export const answerTypeLabels: Record<AnswerType, string> = {
  YES_NO: 'Oui / non',
  SINGLE_CHOICE: 'Un choix',
  MULTIPLE_CHOICE: 'Plusieurs choix',
  NUMBER: 'Nombre',
};
export const urgencyLabels: Record<Urgency, string> = {
  HIGH: 'Urgent : évitez de rouler',
  MEDIUM: 'À faire rapidement',
  LOW: 'Peut attendre le prochain entretien',
};
export const urgencyTones: Record<Urgency, BadgeTone> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
};
