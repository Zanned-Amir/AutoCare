import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AssistantApi } from './assistant.api';
import { AssistantChatStore } from './assistant-chat.store';
import { AssistantStreamChunk, SendAssistantMessageRequest } from './assistant.types';

type Send = (
  request: SendAssistantMessageRequest,
  onChunk: (chunk: AssistantStreamChunk) => void,
) => Promise<void>;

function setup(send: Send) {
  TestBed.configureTestingModule({
    providers: [
      AssistantChatStore,
      { provide: AssistantApi, useValue: { sendAssistantMessage: send } },
    ],
  });
  return TestBed.inject(AssistantChatStore);
}

describe('AssistantChatStore', () => {
  it('writes the streamed answer and sends the earlier messages as history', async () => {
    const requests: SendAssistantMessageRequest[] = [];
    const store = setup(async (request, onChunk) => {
      requests.push(request);
      onChunk({ delta: 'Vérifiez ' });
      onChunk({ delta: 'les plaquettes.' });
    });

    await store.sendAssistantMessage('  Bruit au freinage ');
    await store.sendAssistantMessage('Et le disque ?');

    expect(store.messages().map((m) => [m.role, m.content])).toEqual([
      ['user', 'Bruit au freinage'],
      ['assistant', 'Vérifiez les plaquettes.'],
      ['user', 'Et le disque ?'],
      ['assistant', 'Vérifiez les plaquettes.'],
    ]);
    expect(requests[1]).toEqual({
      message: 'Et le disque ?',
      history: [
        { role: 'user', content: 'Bruit au freinage' },
        { role: 'assistant', content: 'Vérifiez les plaquettes.' },
      ],
    });
    expect(store.streaming()).toBe(false);
  });

  it('takes a refused question back and explains why', async () => {
    const store = setup(() =>
      Promise.reject(
        new HttpErrorResponse({ status: 503, error: { code: 'ASSISTANT_UNAVAILABLE' } }),
      ),
    );

    await store.sendAssistantMessage('Bonjour');

    expect(store.messages()).toEqual([]);
    expect(store.error()).toBe('L’assistant n’est pas disponible pour le moment.');
  });

  it('marks the answer as failed when the stream reports an error', async () => {
    const store = setup(async (_request, onChunk) => onChunk({ error: 'ASSISTANT_UNAVAILABLE' }));

    await store.sendAssistantMessage('Bonjour');

    expect(store.messages()[1]).toMatchObject({ role: 'assistant', failed: true });
  });
});
