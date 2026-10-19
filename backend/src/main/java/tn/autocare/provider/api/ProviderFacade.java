package tn.autocare.provider.api;

import java.util.List;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * What other modules may ask the provider module (service requests check the offer).
 * Implemented by {@code tn.autocare.provider.service.ProviderFacadeImpl}.
 */
public interface ProviderFacade {

	List<ProviderServiceDto> listProviderServices(Long organizationId);

	/**
	 * True when the organization offers the service, and at home if {@code atHome} is
	 * true.
	 */
	boolean isServiceOffered(Long organizationId, Long serviceId, boolean atHome);

	/** Public search over approved providers (same rules as GET /providers). */
	Page<ProviderSummary> searchProviders(@Nullable Long serviceId, @Nullable String governorate,
			@Nullable Boolean atHome, @Nullable String query, Pageable pageable);

}
