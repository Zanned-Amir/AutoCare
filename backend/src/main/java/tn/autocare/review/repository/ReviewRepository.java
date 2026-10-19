package tn.autocare.review.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.review.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {

	boolean existsByServiceRequestId(Long serviceRequestId);

	Optional<Review> findByServiceRequestIdAndUserId(Long serviceRequestId, Long userId);

	Optional<Review> findByIdAndOrganizationId(Long id, Long organizationId);

	Page<Review> findAllByOrganizationId(Long organizationId, Pageable pageable);

	/** organizationId, average rating, count. */
	@Query("select r.organizationId, avg(r.rating), count(r) from Review r where r.organizationId in ?1 group by r.organizationId")
	List<Object[]> summarizeByOrganization(Collection<Long> organizationIds);

	/** rating, count for one organization. */
	@Query("select r.rating, count(r) from Review r where r.organizationId = ?1 group by r.rating")
	List<Object[]> countByRating(Long organizationId);

}
