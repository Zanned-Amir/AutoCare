import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { Button, inputClasses } from '@shared/ui';
import { injectWriteReviewMutation } from '../reviews.queries';
import { Review } from '../reviews.types';
import { StarRating } from './star-rating';

/** The client rates a completed request (once). */
@Component({
  selector: 'app-review-form',
  imports: [Button, StarRating],
  template: `
    <form class="flex flex-col gap-4" (submit)="send($event)" novalidate>
      <app-star-rating [editable]="true" [(value)]="rating" />
      <label class="flex flex-col gap-1.5" for="review-comment">
        <span class="text-[13px] font-medium text-foreground-secondary"
          >Votre avis (facultatif)</span
        >
        <textarea
          id="review-comment"
          maxlength="1000"
          [class]="inputClasses + ' h-28 py-2'"
          placeholder="Accueil, délai, qualité du travail, prix…"
          [value]="comment()"
          (input)="comment.set($any($event.target).value)"
        ></textarea>
        <span class="text-caption text-foreground-muted"
          >Publié avec votre prénom et l’initiale de votre nom.</span
        >
      </label>
      @if (error(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }
      <button appButton variant="accent" type="submit" class="self-start" [disabled]="!canSend()">
        {{ mutation.isPending() ? 'Envoi…' : 'Publier mon avis' }}
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewForm {
  readonly requestId = input.required<number>();
  readonly saved = output<Review>();

  protected readonly inputClasses = inputClasses;
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly mutation = injectWriteReviewMutation(() => this.requestId());
  protected readonly canSend = computed(() => this.rating() > 0 && !this.mutation.isPending());

  protected send(event: Event): void {
    event.preventDefault();
    if (!this.canSend()) return;
    this.error.set(null);
    this.mutation.mutate(
      { rating: this.rating(), comment: this.comment() },
      {
        onSuccess: (review) => this.saved.emit(review),
        onError: (error) => this.error.set(problemMessage(error, 'Envoi impossible')),
      },
    );
  }
}
