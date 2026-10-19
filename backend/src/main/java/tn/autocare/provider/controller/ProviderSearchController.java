package tn.autocare.provider.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.GovernorateLocation;
import tn.autocare.organization.api.Governorates;
import tn.autocare.provider.dto.ProviderSearchResult;
import tn.autocare.provider.service.Near;
import tn.autocare.provider.service.ProviderSearchService;

/**
 * Public: anyone can search approved providers (GET /providers/** is permitted in
 * SecurityConfig).
 */
@Tag(name = "Provider search")
@RestController
@RequestMapping("/providers")
@RequiredArgsConstructor
public class ProviderSearchController {

	private final ProviderSearchService providerSearchService;

	@GetMapping
	public PagedModel<ProviderSearchResult> searchProviders(@RequestParam(required = false) Long serviceId,
			@RequestParam(required = false) String governorate, @RequestParam(required = false) Boolean atHome,
			@RequestParam(required = false) String q, @RequestParam(required = false) Double lat,
			@RequestParam(required = false) Double lng, @RequestParam(required = false) Double radiusKm,
			@PageableDefault(size = 12) Pageable pageable) {
		Near near = lat != null && lng != null ? new Near(lat, lng, radiusKm) : null;
		return new PagedModel<>(
				providerSearchService.searchProviders(serviceId, governorate, atHome, q, near, pageable));
	}

	/** Governorate centres, for "near" when the browser cannot share its position. */
	@GetMapping("/governorates")
	public List<GovernorateLocation> listGovernorateLocations() {
		return Governorates.LOCATIONS;
	}

	@GetMapping("/{organizationId}")
	public ProviderSearchResult getProviderProfile(@PathVariable Long organizationId) {
		return providerSearchService.getProviderProfile(organizationId);
	}

}
