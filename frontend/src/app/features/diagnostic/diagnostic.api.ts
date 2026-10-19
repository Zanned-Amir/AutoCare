import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import {
  AnswerValue,
  DiagnosticResult,
  Question,
  Rule,
  Symptom,
  SymptomFlow,
} from './diagnostic.types';

export interface SymptomBody {
  label: string;
  description: string | null;
  position: number;
  active: boolean;
}

export interface QuestionBody {
  text: string;
  answerType: Question['answerType'];
  options: string[];
  position: number;
}

export type RuleBody = Omit<Rule, 'id' | 'symptomId' | 'serviceName'>;

@Injectable({ providedIn: 'root' })
export class DiagnosticApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/diagnostics`;
  private readonly admin = `${API_URL}/admin/diagnostics/symptoms`;

  listSymptoms(): Promise<Symptom[]> {
    return firstValueFrom(this.http.get<Symptom[]>(`${this.base}/symptoms`));
  }
  getSymptomQuestions(symptomId: number): Promise<{ symptom: Symptom; questions: Question[] }> {
    return firstValueFrom(
      this.http.get<{ symptom: Symptom; questions: Question[] }>(
        `${this.base}/symptoms/${symptomId}`,
      ),
    );
  }
  runDiagnostic(
    symptomId: number,
    vehicleId: number | null,
    answers: Record<number, AnswerValue>,
  ): Promise<DiagnosticResult> {
    return firstValueFrom(
      this.http.post<DiagnosticResult>(this.base, { symptomId, vehicleId, answers }),
    );
  }
  listMyDiagnostics(page: number): Promise<Page<DiagnosticResult>> {
    return firstValueFrom(this.http.get<Page<DiagnosticResult>>(this.base, { params: { page } }));
  }

  // Backoffice
  listAllSymptoms(): Promise<Symptom[]> {
    return firstValueFrom(this.http.get<Symptom[]>(this.admin));
  }
  getSymptomFlow(symptomId: number): Promise<SymptomFlow> {
    return firstValueFrom(this.http.get<SymptomFlow>(`${this.admin}/${symptomId}`));
  }
  saveSymptom(id: number | null, body: SymptomBody): Promise<Symptom> {
    return firstValueFrom(
      id === null
        ? this.http.post<Symptom>(this.admin, body)
        : this.http.put<Symptom>(`${this.admin}/${id}`, body),
    );
  }
  saveQuestion(symptomId: number, id: number | null, body: QuestionBody): Promise<Question> {
    const url = `${this.admin}/${symptomId}/questions`;
    return firstValueFrom(
      id === null
        ? this.http.post<Question>(url, body)
        : this.http.put<Question>(`${url}/${id}`, body),
    );
  }
  deleteQuestion(symptomId: number, id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.admin}/${symptomId}/questions/${id}`));
  }
  saveRule(symptomId: number, id: number | null, body: RuleBody): Promise<Rule> {
    const url = `${this.admin}/${symptomId}/rules`;
    return firstValueFrom(
      id === null ? this.http.post<Rule>(url, body) : this.http.put<Rule>(`${url}/${id}`, body),
    );
  }
  deleteRule(symptomId: number, id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.admin}/${symptomId}/rules/${id}`));
  }
}
