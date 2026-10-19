import { inject } from '@angular/core';
import {
  QueryClient,
  injectMutation,
  injectQuery,
  keepPreviousData,
} from '@tanstack/angular-query-experimental';

import { ReviewsApi } from './reviews.api';

export const reviewKeys = {
  all: ['reviews'] as const,
  mine: (requestId: number) => [...reviewKeys.all, 'mine', requestId] as const,
  provider: (organizationId: number) => [...reviewKeys.all, 'provider', organizationId] as const,
  ratings: (ids: number[]) => [...reviewKeys.all, 'ratings', ids] as const,
};

export function injectMyReviewQuery(requestId: () => number, enabled: () => boolean) {
  const api = inject(ReviewsApi);
  return injectQuery(() => ({
    queryKey: reviewKeys.mine(requestId()),
    queryFn: () => api.getMyReview(requestId()),
    enabled: enabled(),
  }));
}

export function injectWriteReviewMutation(requestId: () => number) {
  const api = inject(ReviewsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ rating, comment }: { rating: number; comment: string }) =>
      api.writeReview(requestId(), rating, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
  }));
}

/** Rating summary and a page of reviews for the public profile. */
export function injectProviderReviewsQueries(organizationId: () => number, page: () => number) {
  const api = inject(ReviewsApi);
  return {
    rating: injectQuery(() => ({
      queryKey: [...reviewKeys.provider(organizationId()), 'rating'],
      queryFn: () => api.getProviderRating(organizationId()),
    })),
    reviews: injectQuery(() => ({
      queryKey: [...reviewKeys.provider(organizationId()), 'list', page()],
      queryFn: () => api.listProviderReviews(organizationId(), page()),
      placeholderData: keepPreviousData,
    })),
  };
}

export function injectRatingsQuery(organizationIds: () => number[]) {
  const api = inject(ReviewsApi);
  return injectQuery(() => ({
    queryKey: reviewKeys.ratings(organizationIds()),
    queryFn: () => api.listRatings(organizationIds()),
    enabled: organizationIds().length > 0,
    staleTime: 60_000,
  }));
}

export function injectOrganizationReviewsQuery(organizationId: () => number, page: () => number) {
  const api = inject(ReviewsApi);
  return injectQuery(() => ({
    queryKey: [...reviewKeys.all, 'organization', organizationId(), page()],
    queryFn: () => api.listOrganizationReviews(organizationId(), page()),
    enabled: organizationId() > 0,
    placeholderData: keepPreviousData,
  }));
}

export function injectReplyToReviewMutation(organizationId: () => number) {
  const api = inject(ReviewsApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ reviewId, reply }: { reviewId: number; reply: string }) =>
      api.replyToReview(organizationId(), reviewId, reply),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
  }));
}
