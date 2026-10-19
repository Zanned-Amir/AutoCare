import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { Icon } from '@shared/ui';
import { cn } from '@shared/utils/cn';

const LABELS = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent'];

/** Five stars: read only (value may be 4.3), or a 1-5 picker with `editable`. */
@Component({
  selector: 'app-star-rating',
  imports: [Icon],
  template: `
    @if (editable()) {
      <div class="flex items-center gap-3">
        <div class="flex gap-1" role="radiogroup" aria-label="Note">
          @for (star of stars; track star) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="value() === star"
              [attr.aria-label]="star + ' étoile(s) : ' + labels[star]"
              class="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
              (click)="value.set(star)"
            >
              <svg appIcon name="star" [class]="starClass(star, 'size-8')"></svg>
            </button>
          }
        </div>
        @if (value()) {
          <span class="text-label text-foreground">{{ labels[value()] }}</span>
        }
      </div>
    } @else {
      <span
        class="inline-flex items-center gap-0.5"
        role="img"
        [attr.aria-label]="'Note : ' + value() + ' sur 5'"
      >
        @for (star of stars; track star) {
          <svg appIcon name="star" [class]="starClass(star, sizeClass())"></svg>
        }
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRating {
  readonly value = model(0);
  readonly editable = input(false);
  readonly size = input<'sm' | 'md'>('sm');

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly labels = LABELS;
  protected readonly sizeClass = computed(() => (this.size() === 'sm' ? 'size-4' : 'size-5'));

  /** Half a star or more fills it, so 4.5 reads as five. */
  protected starClass(star: number, size: string): string {
    return cn(
      size,
      Math.round(this.value()) >= star ? 'fill-current text-accent' : 'text-border-strong',
    );
  }
}
