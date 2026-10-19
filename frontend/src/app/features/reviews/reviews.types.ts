/** Mirrors the backend ReviewResponse; `authorName` is "Sami B.". */
export interface Review {
  id: number;
  serviceRequestId: number;
  rating: number;
  comment: string | null;
  authorName: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

/** `byRating` is filled only for one provider's summary ("5" -> count). */
export interface RatingSummary {
  average: number;
  count: number;
  byRating: Record<string, number>;
}
