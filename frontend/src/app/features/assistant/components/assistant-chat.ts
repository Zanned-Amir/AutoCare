import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { Button, EmptyState, Icon, Spinner, inputClasses } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { AssistantChatStore } from '../assistant-chat.store';
import { AssistantMessage } from '../assistant.types';

const SUGGESTIONS = [
  'Ma voiture fait un bruit en freinant',
  'Quand faire la vidange de ma voiture ?',
  'Un voyant orange s’est allumé, que faire ?',
];

/** Chat with the AI assistant. Needs AssistantChatStore from the page. */
@Component({
  selector: 'app-assistant-chat',
  imports: [Button, EmptyState, Icon, Spinner],
  template: `
    <div class="flex flex-col gap-3">
      <div
        #scroller
        class="flex max-h-[60vh] min-h-72 flex-col gap-3 overflow-y-auto overscroll-y-contain rounded-xl bg-background-subtle p-3"
        role="log"
        aria-live="polite"
        aria-label="Conversation avec l’assistant"
      >
        @for (message of store.messages(); track message.id) {
          <div [class]="rowClass(message)">
            <span class="px-1 text-caption text-foreground-muted">
              {{ message.role === 'user' ? 'Vous' : 'Assistant AutoCare' }}
            </span>
            @if (message.failed) {
              <p [class]="bubbleClass(message)">
                {{ message.content }}
                <span class="block text-error">L’assistant ne répond pas. Réessayez.</span>
              </p>
            } @else if (message.content) {
              <p [class]="bubbleClass(message)">{{ message.content }}</p>
            } @else {
              <div [class]="bubbleClass(message)"><app-spinner /></div>
            }
          </div>
        } @empty {
          <app-empty-state
            image="diagnostic"
            size="sm"
            title="Posez votre question"
            description="Un symptôme, un voyant, l’entretien de votre voiture : l’assistant vous oriente. Pour réserver, vous gardez la main."
          >
            @for (suggestion of suggestions; track suggestion) {
              <button
                appButton
                variant="secondary"
                size="sm"
                type="button"
                (click)="ask(suggestion)"
              >
                {{ suggestion }}
              </button>
            }
          </app-empty-state>
        }
      </div>

      <form class="flex items-end gap-2" (submit)="send($event)" novalidate>
        <label class="sr-only" for="assistant-input">Votre question</label>
        <textarea
          id="assistant-input"
          rows="2"
          maxlength="2000"
          [class]="textareaClass"
          placeholder="Décrivez votre problème…  (Entrée pour envoyer)"
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
          (keydown.enter)="onEnter($any($event))"
        ></textarea>
        @if (store.streaming()) {
          <button
            appButton
            variant="secondary"
            type="button"
            aria-label="Arrêter la réponse"
            (click)="store.stopAssistantAnswer()"
          >
            <svg appIcon name="x" class="size-4"></svg>
          </button>
        } @else {
          <button appButton type="submit" aria-label="Envoyer" [disabled]="!canSend()">
            <svg appIcon name="send" class="size-4"></svg>
          </button>
        }
      </form>

      <div class="flex flex-wrap items-center justify-between gap-2">
        @if (store.error(); as message) {
          <p class="text-caption text-error" role="alert">{{ message }}</p>
        } @else {
          <p class="text-caption text-foreground-muted">
            Réponses générées par une IA : en cas de danger (freins, direction, fumée), arrêtez-vous
            et contactez un garage.
          </p>
        }
        @if (!store.isEmpty()) {
          <button
            appButton
            variant="ghost"
            size="sm"
            type="button"
            (click)="store.clearConversation()"
          >
            Nouvelle conversation
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantChat {
  protected readonly store = inject(AssistantChatStore);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly suggestions = SUGGESTIONS;
  protected readonly textareaClass = cn(inputClasses, 'h-auto min-h-11 flex-1 resize-none py-2');
  protected readonly draft = signal('');
  protected readonly canSend = computed(
    () => this.draft().trim().length > 0 && !this.store.streaming(),
  );

  constructor() {
    // Follow the answer as it is written.
    effect(() => {
      const last = this.store.messages().at(-1)?.content.length ?? 0;
      const element = this.scroller()?.nativeElement;
      if (element && last >= 0) queueMicrotask(() => (element.scrollTop = element.scrollHeight));
    });
  }

  protected rowClass(message: AssistantMessage): string {
    return cn(
      'flex max-w-[85%] flex-col gap-1',
      message.role === 'user' ? 'items-end self-end' : 'items-start',
    );
  }

  protected bubbleClass(message: AssistantMessage): string {
    return cn(
      'rounded-2xl px-3.5 py-2 text-body-sm break-words whitespace-pre-line',
      message.role === 'user'
        ? 'rounded-br-md bg-primary text-primary-foreground'
        : 'rounded-bl-md border border-border-subtle bg-surface text-foreground',
    );
  }

  protected ask(question: string): void {
    void this.store.sendAssistantMessage(question);
  }

  /** Enter sends, Shift+Enter goes to a new line. */
  protected onEnter(event: KeyboardEvent): void {
    if (event.shiftKey || event.isComposing) return;
    this.send(event);
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (!this.canSend()) return;
    const text = this.draft();
    this.draft.set('');
    void this.store.sendAssistantMessage(text);
  }
}
