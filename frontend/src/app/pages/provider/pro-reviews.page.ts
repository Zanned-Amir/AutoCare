import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthStore } from '@core/auth/auth.store';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { ReviewCard } from '@features/reviews/components/review-card';
import { StarRating } from '@features/reviews/components/star-rating';
import {
  injectOrganizationReviewsQuery,
  injectProviderReviewsQueries,
} from '@features/reviews/reviews.queries';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { ProContext } from '@layouts/pro/pro-context';
import { Button, Card, EmptyState, Spinner } from '@shared/ui';

/** What clients say about the organization, with the team's answers. */
@Component({
  selector: 'app-pro-reviews-page',
  imports: [AdminPageHeader, Button, Card, EmptyState, ReviewCard, Spinner, StarRating],
  template: `
    <app-admin-page-header
      title="Avis clients"
      subtitle="Les notes laissées après chaque intervention terminée. Une réponse courtoise rassure les futurs clients."
    ></app-admin-page-header>
    <div class="grid gap-6 px-4 py-5 md:px-8 md:py-8 xl:grid-cols-[1fr_300px]">
      <app-card class="p-0">
        @if (reviews.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else if (reviews.data(); as page) {
          <ul class="divide-y divide-border-subtle">
            @for (review of page.content; track review.id) {
              <li class="px-5 py-4">
                <app-review-card
                  [review]="review"
                  [replyable]="canReply()"
                  [organizationId]="id()"
                />
              </li>
            } @empty {
              <li>
                <app-empty-state
                  image="pro-garage"
                  size="sm"
                  title="Pas encore d’avis"
                  description="Les clients peuvent noter une intervention dès qu’elle est marquée terminée."
                />
              </li>
            }
          </ul>
          @if (page.page.totalPages > 1) {
            <div
              class="flex items-center justify-between border-t border-border-subtle px-5 py-3 text-body-sm"
            >
              <span class="text-foreground-secondary"
                >Page {{ page.page.number + 1 }} / {{ page.page.totalPages }}</span
              >
              <div class="flex gap-2">
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [disabled]="page.page.number === 0"
                  (click)="pageIndex.set(page.page.number - 1)"
                >
                  Précédent
                </button>
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [disabled]="page.page.number + 1 >= page.page.totalPages"
                  (click)="pageIndex.set(page.page.number + 1)"
                >
                  Suivant
                </button>
              </div>
            </div>
          }
        }
      </app-card>

      @if (summary.rating.data(); as rating) {
        <app-card class="flex h-fit flex-col gap-2">
          <p class="text-overline text-accent-text uppercase">Note moyenne</p>
          <span class="text-h1 text-primary">{{
            rating.count ? rating.average.toFixed(1) : '–'
          }}</span>
          <app-star-rating size="md" [value]="rating.average" />
          <span class="text-caption text-foreground-muted">{{ rating.count }} avis</span>
        </app-card>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProReviewsPage {
  private readonly context = inject(ProContext);
  private readonly auth = inject(AuthStore);
  protected readonly id = computed(() => this.context.organizationId());
  protected readonly pageIndex = signal(0);
  protected readonly reviews = injectOrganizationReviewsQuery(
    () => this.id(),
    () => this.pageIndex(),
  );
  protected readonly summary = injectProviderReviewsQueries(
    () => this.id(),
    () => 0,
  );
  protected readonly canReply = computed(() =>
    this.auth.canInOrganization(OrganizationPermissions.ORGANIZATION_UPDATE),
  );
}
