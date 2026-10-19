package tn.autocare.provider.controller;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.CatalogPermissions;
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.provider.dto.ProviderServiceResponse;
import tn.autocare.provider.service.ProviderOfferService;

/** Providers' offers seen from the backoffice (organization page, catalog). */
@Tag(name = "Admin - Provider services")
@RestController
@RequiredArgsConstructor
public class AdminProviderController {

	private final ProviderOfferService providerOfferService;

	@GetMapping("/admin/organizations/{organizationId}/services")
	@PreAuthorize("@perm.has('" + OrganizationPermissions.ORGANIZATION_APPROVE + "')")
	public List<ProviderServiceResponse> listOrganizationProviderServices(@PathVariable Long organizationId) {
		return providerOfferService.listProviderServices(organizationId);
	}

	/** Catalog service id to the number of organizations offering it. */
	@GetMapping("/admin/catalog/services/provider-counts")
	@PreAuthorize("@perm.has('" + CatalogPermissions.SERVICE_READ + "')")
	public Map<Long, Long> countProvidersByService() {
		return providerOfferService.countProvidersByService();
	}

}
