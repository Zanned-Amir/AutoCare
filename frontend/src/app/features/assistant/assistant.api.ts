import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { SessionService } from '@core/auth/session.service';
import { AssistantStreamChunk, SendAssistantMessageRequest } from './assistant.types';

/**
 * POST /assistant/messages answers with server-sent events, so it goes through fetch()
 * (HttpClient would wait for the whole body). Errors before the stream starts are thrown as
 * HttpErrorResponse, so problemMessage() reads their code like any other call.
 */
@Injectable({ providedIn: 'root' })
export class AssistantApi {
  private readonly auth = inject(AuthStore);
  private readonly session = inject(SessionService);

  async sendAssistantMessage(
    request: SendAssistantMessageRequest,
    onChunk: (chunk: AssistantStreamChunk) => void,
    signal: AbortSignal,
  ): Promise<void> {
    let response = await this.post(request, signal);
    if (response.status === 401 && (await this.session.refreshSession())) {
      response = await this.post(request, signal);
    }
    if (!response.ok || !response.body) {
      throw new HttpErrorResponse({
        status: response.status,
        error: await response.json().catch(() => null),
      });
    }
    await readEvents(response.body, (data) => {
      if (data !== '[DONE]') onChunk(JSON.parse(data) as AssistantStreamChunk);
    });
  }

  private post(request: SendAssistantMessageRequest, signal: AbortSignal): Promise<Response> {
    return fetch(`${API_URL}/assistant/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.auth.accessToken()}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/problem+json',
      },
      body: JSON.stringify(request),
      signal,
    });
  }
}

async function readEvents(
  body: ReadableStream<Uint8Array>,
  onData: (data: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const data = buffer
        .slice(0, end)
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      buffer = buffer.slice(end + 2);
      if (data) onData(data);
    }
  }
}
