package tn.autocare.review.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.review.api.ReviewPermissions;
import tn.autocare.review.dto.RatingSummaryResponse;
import tn.autocare.review.dto.ReplyToReviewRequest;
import tn.autocare.review.dto.ReviewResponse;
import tn.autocare.review.dto.WriteReviewRequest;
import tn.autocare.review.service.ReviewService;
import tn.autocare.shared.security.CurrentUser;

/**
 * The client reviews a completed request; anyone reads a provider's reviews and rating;
 * members with organization:update answer them.
 */
@Tag(name = "Reviews")
@RestController
@RequiredArgsConstructor
public class ReviewController {

	private final ReviewService reviewService;

	@PostMapping("/service-requests/{requestId}/review")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + ReviewPermissions.REVIEW_CREATE + "')")
	public ReviewResponse writeReview(@PathVariable Long requestId, @Valid @RequestBody WriteReviewRequest request) {
		return reviewService.writeReview(CurrentUser.id(), requestId, request);
	}

	@GetMapping("/service-requests/{requestId}/review")
	@PreAuthorize("@perm.has('" + ReviewPermissions.REVIEW_CREATE + "')")
	public ResponseEntity<ReviewResponse> getMyReview(@PathVariable Long requestId) {
		ReviewResponse review = reviewService.findMyReview(CurrentUser.id(), requestId);
		return review == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(review);
	}

	@GetMapping("/providers/{organizationId}/reviews")
	public PagedModel<ReviewResponse> listProviderReviews(@PathVariable Long organizationId,
			@PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(reviewService.listOrganizationReviews(organizationId, pageable));
	}

	@GetMapping("/providers/{organizationId}/rating")
	public RatingSummaryResponse getProviderRating(@PathVariable Long organizationId) {
		return reviewService.summarizeOrganizationRating(organizationId);
	}

	/**
	 * Ratings of a page of search results, in one call (organizations without reviews are
	 * absent).
	 */
	@GetMapping("/providers/ratings")
	public Map<Long, RatingSummaryResponse> listProviderRatings(@RequestParam List<Long> organizationIds) {
		return reviewService.summarizeRatings(organizationIds);
	}

	@GetMapping("/organizations/{organizationId}/reviews")
	@PreAuthorize("@orgPerm.has(#organizationId, '" + OrganizationPermissions.ORGANIZATION_READ + "')")
	public PagedModel<ReviewResponse> listOrganizationReviews(@PathVariable Long organizationId,
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(reviewService.listOrganizationReviews(organizationId, pageable));
	}

	@PutMapping("/organizations/{organizationId}/reviews/{reviewId}/reply")
	@PreAuthorize("@orgPerm.has(#organizationId, '" + OrganizationPermissions.ORGANIZATION_UPDATE + "')")
	public ReviewResponse replyToReview(@PathVariable Long organizationId, @PathVariable Long reviewId,
			@Valid @RequestBody ReplyToReviewRequest request) {
		return reviewService.replyToReview(organizationId, reviewId, request.reply());
	}

}
