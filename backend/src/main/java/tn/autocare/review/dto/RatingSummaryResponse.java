package tn.autocare.review.dto;

import java.util.Map;

/**
 * {@code average} rounded to one decimal; {@code byRating} star count to number of
 * reviews.
 */
public record RatingSummaryResponse(double average, long count, Map<Integer, Long> byRating) {
}
