import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { problemMessage } from '@core/api/api';
import { Button, Icon, Spinner, inputClasses } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { injectPostMessageMutation, injectRequestMessagesQuery } from '../service-requests.queries';
import { RequestMessage } from '../service-requests.types';

const timeFormat = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Chat of a request between the client and the garage. `organizationId` null = the client's
 * side. `closed` (refused or cancelled request) keeps the history but hides the composer.
 */
@Component({
  selector: 'app-request-chat',
  imports: [Button, Icon, Spinner],
  template: `
    <div class="flex flex-col gap-3">
      <div
        #scroller
        class="flex max-h-96 min-h-32 flex-col gap-3 overflow-y-auto overscroll-y-contain rounded-xl bg-background-subtle p-3"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        @if (messages.isPending()) {
          <div class="grid flex-1 place-items-center"><app-spinner /></div>
        } @else {
          @for (message of messages.data(); track message.id) {
            <div [class]="rowClass(message)">
              <span class="px-1 text-caption text-foreground-muted">
                {{ authorLabel(message) }} · {{ format(message.createdAt) }}
              </span>
              <p [class]="bubbleClass(message)">{{ message.body }}</p>
            </div>
          } @empty {
            <p class="m-auto max-w-64 text-center text-body-sm text-foreground-muted">
              {{ emptyText() }}
            </p>
          }
        }
      </div>

      @if (closed()) {
        <p class="text-caption text-foreground-muted">
          Demande close : la discussion n’est plus possible.
        </p>
      } @else {
        <form class="flex items-end gap-2" (submit)="send($event)" novalidate>
          <label class="sr-only" [for]="inputId">Votre message</label>
          <textarea
            [id]="inputId"
            rows="2"
            maxlength="2000"
            [class]="textareaClass"
            placeholder="Écrire un message…  (Entrée pour envoyer)"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            (keydown.enter)="onEnter($any($event))"
          ></textarea>
          <button appButton type="submit" aria-label="Envoyer" [disabled]="!canSend()">
            <svg appIcon name="send" class="size-4"></svg>
          </button>
        </form>
        @if (error(); as message) {
          <p class="text-caption text-error" role="alert">{{ message }}</p>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestChat {
  readonly requestId = input.required<number>();
  readonly organizationId = input<number | null>(null);
  readonly closed = input(false);

  protected readonly messages = injectRequestMessagesQuery(
    () => this.requestId(),
    () => this.organizationId(),
  );
  private readonly post = injectPostMessageMutation(
    () => this.requestId(),
    () => this.organizationId(),
  );
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly inputId = `chat-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly textareaClass = cn(inputClasses, 'h-auto min-h-11 flex-1 resize-none py-2');
  protected readonly draft = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly canSend = computed(
    () => this.draft().trim().length > 0 && !this.post.isPending(),
  );
  protected readonly emptyText = computed(() =>
    this.organizationId() === null
      ? 'Une question sur l’intervention ? Écrivez au garage ici.'
      : 'Aucun message. Écrivez au client pour préciser l’heure, le prix ou les pièces.',
  );

  constructor() {
    // Follow the newest message.
    effect(() => {
      const count = this.messages.data()?.length ?? 0;
      const element = this.scroller()?.nativeElement;
      if (element && count) queueMicrotask(() => (element.scrollTop = element.scrollHeight));
    });
  }

  protected format(date: string): string {
    return timeFormat.format(new Date(date));
  }

  protected authorLabel(message: RequestMessage): string {
    if (message.mine) return 'Vous';
    if (message.side === 'PROVIDER') return message.authorName || 'Le garage';
    return message.authorName || 'Client';
  }

  protected rowClass(message: RequestMessage): string {
    return cn(
      'flex max-w-[85%] flex-col gap-1',
      message.mine ? 'items-end self-end' : 'items-start',
    );
  }

  protected bubbleClass(message: RequestMessage): string {
    return cn(
      'rounded-2xl px-3.5 py-2 text-body-sm break-words whitespace-pre-line',
      message.mine
        ? 'rounded-br-md bg-primary text-primary-foreground'
        : 'rounded-bl-md border border-border-subtle bg-surface text-foreground',
    );
  }

  /** Enter sends, Shift+Enter goes to a new line. */
  protected onEnter(event: KeyboardEvent): void {
    if (event.shiftKey || event.isComposing) return;
    this.send(event);
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (!this.canSend()) return;
    this.error.set(null);
    this.post
      .mutateAsync(this.draft().trim())
      .then(() => this.draft.set(''))
      .catch((error: unknown) => this.error.set(problemMessage(error, 'Envoi impossible')));
  }
}
