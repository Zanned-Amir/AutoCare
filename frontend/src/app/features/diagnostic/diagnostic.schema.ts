import { z } from 'zod';

import { ANSWER_TYPES, URGENCIES } from './diagnostic.types';

export const symptomSchema = z.object({
  label: z.string().trim().min(1, 'Le libellé est obligatoire').max(120, '120 caractères maximum'),
  description: z.string().max(500, '500 caractères maximum'),
  position: z.number({ error: 'Obligatoire' }).int().min(0),
  active: z.boolean(),
});
export type SymptomValue = z.infer<typeof symptomSchema>;

/** Choices are typed one per line. */
export const questionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'La question est obligatoire')
      .max(300, '300 caractères maximum'),
    answerType: z.enum(ANSWER_TYPES),
    options: z.string(),
    position: z.number({ error: 'Obligatoire' }).int().min(0),
  })
  .refine(
    (value) =>
      (value.answerType !== 'SINGLE_CHOICE' && value.answerType !== 'MULTIPLE_CHOICE') ||
      splitOptions(value.options).length >= 2,
    { message: 'Au moins deux choix, un par ligne', path: ['options'] },
  );
export type QuestionValue = z.infer<typeof questionSchema>;

export const ruleSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(120, '120 caractères maximum'),
  priority: z.number({ error: 'Obligatoire' }).int().min(0).max(1000),
  possibleCause: z
    .string()
    .trim()
    .min(1, 'La cause est obligatoire')
    .max(300, '300 caractères maximum'),
  recommendation: z
    .string()
    .trim()
    .min(1, 'La recommandation est obligatoire')
    .max(1000, '1000 caractères maximum'),
  serviceId: z.string(),
  urgency: z.enum(URGENCIES),
});
export type RuleValue = z.infer<typeof ruleSchema>;

export function splitOptions(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
