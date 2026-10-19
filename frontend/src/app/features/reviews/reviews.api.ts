import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { RatingSummary, Review } from './reviews.types';

@Injectable({ providedIn: 'root' })
export class ReviewsApi {
  private readonly http = inject(HttpClient);

  /** The signed-in client's review of a request, null when not written yet. */
  getMyReview(requestId: number): Promise<Review | null> {
    return firstValueFrom(
      this.http.get<Review | null>(`${API_URL}/service-requests/${requestId}/review`),
    );
  }

  writeReview(requestId: number, rating: number, comment: string): Promise<Review> {
    return firstValueFrom(
      this.http.post<Review>(`${API_URL}/service-requests/${requestId}/review`, {
        rating,
        comment: comment.trim() || null,
      }),
    );
  }

  listProviderReviews(organizationId: number, page: number): Promise<Page<Review>> {
    const params = new HttpParams().set('page', page).set('size', 5);
    return firstValueFrom(
      this.http.get<Page<Review>>(`${API_URL}/providers/${organizationId}/reviews`, { params }),
    );
  }

  getProviderRating(organizationId: number): Promise<RatingSummary> {
    return firstValueFrom(
      this.http.get<RatingSummary>(`${API_URL}/providers/${organizationId}/rating`),
    );
  }

  /** One call for a page of search results; providers without reviews are absent. */
  listRatings(organizationIds: number[]): Promise<Record<string, RatingSummary>> {
    const params = new HttpParams().set('organizationIds', organizationIds.join(','));
    return firstValueFrom(
      this.http.get<Record<string, RatingSummary>>(`${API_URL}/providers/ratings`, { params }),
    );
  }

  listOrganizationReviews(organizationId: number, page: number): Promise<Page<Review>> {
    const params = new HttpParams().set('page', page).set('size', 20);
    return firstValueFrom(
      this.http.get<Page<Review>>(`${API_URL}/organizations/${organizationId}/reviews`, { params }),
    );
  }

  replyToReview(organizationId: number, reviewId: number, reply: string): Promise<Review> {
    return firstValueFrom(
      this.http.put<Review>(
        `${API_URL}/organizations/${organizationId}/reviews/${reviewId}/reply`,
        {
          reply: reply.trim() || null,
        },
      ),
    );
  }
}
