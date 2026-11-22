export type AssistantRole = 'user' | 'assistant';

/** What the API takes as history (mirror of AssistantChatMessage). */
export interface AssistantChatMessage {
  role: AssistantRole;
  content: string;
}

export interface SendAssistantMessageRequest {
  message: string;
  history: AssistantChatMessage[];
}

/** One bubble on screen. `failed`: the answer stopped with an error. */
export interface AssistantMessage extends AssistantChatMessage {
  id: number;
  failed?: boolean;
}

/** Payload of one server-sent event of /assistant/messages. */
export interface AssistantStreamChunk {
  delta?: string;
  error?: string;
}
