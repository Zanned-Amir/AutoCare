import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { problemMessage } from '@core/api/api';
import { AssistantApi } from './assistant.api';
import { AssistantChatMessage, AssistantMessage } from './assistant.types';

/** Messages sent back as context with each question (the API takes up to 20). */
const HISTORY_SIZE = 10;

/**
 * The conversation lives in this browser tab only: it is not stored by the API. Provide the
 * store in the page, so leaving the page clears it.
 */
export const AssistantChatStore = signalStore(
  withState({
    messages: [] as AssistantMessage[],
    streaming: false,
    error: null as string | null,
  }),
  withComputed((store) => ({
    isEmpty: computed(() => store.messages().length === 0),
  })),
  withMethods((store, api = inject(AssistantApi)) => {
    let controller: AbortController | null = null;
    let nextId = 1;

    function updateAnswer(id: number, change: (message: AssistantMessage) => AssistantMessage) {
      patchState(store, {
        messages: store
          .messages()
          .map((message) => (message.id === id ? change(message) : message)),
      });
    }

    return {
      async sendAssistantMessage(text: string): Promise<void> {
        const message = text.trim();
        if (!message || store.streaming()) return;
        const history: AssistantChatMessage[] = store
          .messages()
          .filter((m) => !m.failed && m.content)
          .slice(-HISTORY_SIZE)
          .map(({ role, content }) => ({ role, content }));
        const answerId = nextId + 1;
        patchState(store, {
          messages: [
            ...store.messages(),
            { id: nextId, role: 'user', content: message },
            { id: answerId, role: 'assistant', content: '' },
          ],
          streaming: true,
          error: null,
        });
        nextId += 2;
        controller = new AbortController();
        try {
          await api.sendAssistantMessage(
            { message, history },
            (chunk) => {
              if (chunk.delta)
                updateAnswer(answerId, (m) => ({ ...m, content: m.content + chunk.delta }));
              if (chunk.error) updateAnswer(answerId, (m) => ({ ...m, failed: true }));
            },
            controller.signal,
          );
        } catch (error) {
          if (!controller.signal.aborted) {
            // The question was refused (off, too fast): take it back so it can be sent again.
            patchState(store, {
              messages: store.messages().filter((m) => m.id !== answerId && m.id !== answerId - 1),
              error: problemMessage(error, 'L’assistant ne répond pas. Réessayez.'),
            });
          }
        } finally {
          controller = null;
          patchState(store, { streaming: false });
        }
      },
      stopAssistantAnswer(): void {
        controller?.abort();
      },
      clearConversation(): void {
        controller?.abort();
        patchState(store, { messages: [], error: null });
      },
    };
  }),
);
