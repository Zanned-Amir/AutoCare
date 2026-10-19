package tn.autocare.review.service;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.review.dto.RatingSummaryResponse;
import tn.autocare.review.dto.ReviewResponse;
import tn.autocare.review.dto.WriteReviewRequest;
import tn.autocare.review.entity.Review;
import tn.autocare.review.repository.ReviewRepository;
import tn.autocare.servicerequest.api.ServiceRequestDto;
import tn.autocare.servicerequest.api.ServiceRequestFacade;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

	static final int MAX_RATING_IDS = 100;

	private final ReviewRepository reviewRepository;

	private final ServiceRequestFacade serviceRequestFacade;

	private final AuthFacade authFacade;

	/** Only the client of a completed request, once. */
	@Transactional
	public ReviewResponse writeReview(Long userId, Long serviceRequestId, WriteReviewRequest request) {
		if (!serviceRequestFacade.isServiceRequestCompletedBy(serviceRequestId, userId)) {
			throw new AppException(ErrorCode.REVIEW_NOT_ALLOWED, "Only a completed request of yours can be reviewed");
		}
		if (reviewRepository.existsByServiceRequestId(serviceRequestId)) {
			throw new AppException(ErrorCode.REVIEW_ALREADY_EXISTS, "This request already has a review");
		}
		ServiceRequestDto serviceRequest = serviceRequestFacade.findServiceRequest(serviceRequestId)
			.orElseThrow(() -> AppException.notFound("ServiceRequest", serviceRequestId));
		Review review = reviewRepository.save(Review.write(serviceRequestId, serviceRequest.organizationId(), userId,
				request.rating(), request.comment()));
		return toResponses(List.of(review)).getFirst();
	}

	public ReviewResponse findMyReview(Long userId, Long serviceRequestId) {
		return reviewRepository.findByServiceRequestIdAndUserId(serviceRequestId, userId)
			.map(review -> toResponses(List.of(review)).getFirst())
			.orElse(null);
	}

	public Page<ReviewResponse> listOrganizationReviews(Long organizationId, Pageable pageable) {
		Page<Review> page = reviewRepository.findAllByOrganizationId(organizationId, pageable);
		return new PageImpl<>(toResponses(page.getContent()), page.getPageable(), page.getTotalElements());
	}

	public RatingSummaryResponse summarizeOrganizationRating(Long organizationId) {
		Map<Integer, Long> byRating = new LinkedHashMap<>();
		for (int stars = 5; stars >= 1; stars--) {
			byRating.put(stars, 0L);
		}
		long count = 0;
		long total = 0;
		for (Object[] row : reviewRepository.countByRating(organizationId)) {
			int stars = ((Number) row[0]).intValue();
			long n = (Long) row[1];
			byRating.put(stars, n);
			count += n;
			total += stars * n;
		}
		return new RatingSummaryResponse(count == 0 ? 0 : round(total / (double) count), count, byRating);
	}

	/**
	 * Average and count per organization, for search results (organizations with no
	 * review are absent).
	 */
	public Map<Long, RatingSummaryResponse> summarizeRatings(Collection<Long> organizationIds) {
		if (organizationIds.isEmpty()) {
			return Map.of();
		}
		if (organizationIds.size() > MAX_RATING_IDS) {
			throw new AppException(ErrorCode.VALIDATION_FAILED, "At most 100 organizations");
		}
		return reviewRepository.summarizeByOrganization(organizationIds)
			.stream()
			.collect(Collectors.toMap(row -> (Long) row[0],
					row -> new RatingSummaryResponse(round(((Number) row[1]).doubleValue()), (Long) row[2], Map.of())));
	}

	@Transactional
	public ReviewResponse replyToReview(Long organizationId, Long reviewId, String reply) {
		Review review = reviewRepository.findByIdAndOrganizationId(reviewId, organizationId)
			.orElseThrow(() -> AppException.notFound("Review", reviewId));
		review.reply(reply, Instant.now());
		return toResponses(List.of(review)).getFirst();
	}

	private List<ReviewResponse> toResponses(List<Review> reviews) {
		Map<Long, UserSummary> authors = authFacade
			.listUsers(reviews.stream().map(Review::getUserId).distinct().toList())
			.stream()
			.collect(Collectors.toMap(UserSummary::id, Function.identity()));
		return reviews.stream()
			.map(review -> new ReviewResponse(review.getId(), review.getServiceRequestId(), review.getRating(),
					review.getComment(), shortName(authors.get(review.getUserId())), review.getReply(),
					review.getRepliedAt(), review.getCreatedAt()))
			.toList();
	}

	/** "Sami Ben Ali" becomes "Sami B.": reviews are public. */
	static String shortName(UserSummary user) {
		if (user == null || user.fullName() == null || user.fullName().isBlank()) {
			return "Client";
		}
		String[] parts = user.fullName().trim().split("\\s+");
		return parts.length == 1 ? parts[0] : parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
	}

	private static double round(double value) {
		return Math.round(value * 10) / 10.0;
	}

}
