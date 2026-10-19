import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  input,
  linkedSignal,
  signal,
} from '@angular/core';

import { problemMessage } from '@core/api/api';
import { Button, inputClasses } from '@shared/ui';
import { injectReplyToReviewMutation } from '../reviews.queries';
import { Review } from '../reviews.types';
import { StarRating } from './star-rating';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

/** One review with the provider's answer; with `replyable` the pro can write or change it. */
@Component({
  selector: 'app-review-card',
  imports: [Button, StarRating],
  template: `
    <article class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <app-star-rating [value]="review().rating" />
        <span class="text-label text-foreground">{{ review().authorName }}</span>
        <span class="text-caption text-foreground-muted">{{ format(review().createdAt) }}</span>
      </div>
      @if (review().comment; as comment) {
        <p class="text-body-sm text-foreground-secondary">{{ comment }}</p>
      }
      @if (editing()) {
        <div class="flex flex-col gap-2 rounded-xl bg-background-subtle p-3">
          <textarea
            maxlength="1000"
            aria-label="Votre réponse"
            [class]="inputClasses + ' h-24 bg-surface py-2'"
            placeholder="Merci pour votre retour…"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
          ></textarea>
          @if (error(); as message) {
            <p class="text-caption text-error">{{ message }}</p>
          }
          <div class="flex gap-2">
            <button
              appButton
              size="sm"
              type="button"
              [disabled]="reply.isPending() || draft() === (review().reply ?? '')"
              (click)="sendReply()"
            >
              Publier la réponse
            </button>
            <button appButton variant="ghost" size="sm" type="button" (click)="editing.set(false)">
              Annuler
            </button>
          </div>
        </div>
      } @else if (review().reply; as answer) {
        <div class="ml-4 rounded-xl border-l-[3px] border-primary bg-primary-subtle px-3 py-2">
          <p class="text-caption font-semibold text-primary">Réponse du garage</p>
          <p class="text-body-sm text-foreground-secondary">{{ answer }}</p>
          @if (replyable()) {
            <button
              type="button"
              class="mt-1 text-caption font-semibold text-accent-text hover:underline"
              (click)="editing.set(true)"
            >
              Modifier
            </button>
          }
        </div>
      } @else if (replyable()) {
        <button
          appButton
          variant="secondary"
          size="sm"
          type="button"
          class="self-start"
          (click)="editing.set(true)"
        >
          Répondre
        </button>
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewCard {
  readonly review = input.required<Review>();
  readonly replyable = input(false, { transform: booleanAttribute });
  readonly organizationId = input(0);

  protected readonly inputClasses = inputClasses;
  protected readonly editing = signal(false);
  protected readonly draft = linkedSignal(() => this.review().reply ?? '');
  protected readonly error = signal<string | null>(null);
  protected readonly reply = injectReplyToReviewMutation(() => this.organizationId());

  protected sendReply(): void {
    this.error.set(null);
    this.reply.mutate(
      { reviewId: this.review().id, reply: this.draft() },
      {
        onSuccess: () => this.editing.set(false),
        onError: (error) => this.error.set(problemMessage(error, 'Envoi impossible')),
      },
    );
  }

  protected format(value: string): string {
    return dateFormat.format(new Date(value));
  }
}
