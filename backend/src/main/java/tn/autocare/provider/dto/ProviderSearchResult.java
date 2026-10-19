package tn.autocare.provider.dto;

import java.net.URI;
import java.util.List;

import org.jspecify.annotations.Nullable;

/**
 * One provider in search results or on its public profile page. {@code photoUrls}: the
 * whole gallery on the profile, only the first photo (cover) in search results.
 */
public record ProviderSearchResult(Long organizationId, String name, String description, String phone,
		String governorate, String city, String address, String serviceZone, @Nullable URI logoUrl, List<URI> photoUrls,
		@Nullable Double latitude, @Nullable Double longitude, boolean approximateLocation, @Nullable Double distanceKm,
		List<ProviderServiceResponse> services) {
}
