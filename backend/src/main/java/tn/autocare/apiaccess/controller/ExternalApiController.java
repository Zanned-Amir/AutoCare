package tn.autocare.apiaccess.controller;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.apiaccess.dto.ExternalStatusResponse;
import tn.autocare.apiaccess.security.ApiKeyPrincipal;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.provider.api.ProviderFacade;
import tn.autocare.provider.api.ProviderSummary;

/**
 * The partner API (insurers, fleet managers...). Authenticated with an API key, never
 * with a user token.
 */
@Tag(name = "External API v1")
@RestController
@RequestMapping("/external/v1")
@RequiredArgsConstructor
public class ExternalApiController {

	private final CatalogFacade catalogFacade;

	private final ProviderFacade providerFacade;

	@GetMapping("/status")
	@PreAuthorize("hasAuthority('status:read')")
	public ExternalStatusResponse getExternalStatus(@AuthenticationPrincipal ApiKeyPrincipal key) {
		return new ExternalStatusResponse("ok", Instant.now(), key.label(), key.environment(), key.permissions());
	}

	@GetMapping("/catalog/services")
	@PreAuthorize("hasAuthority('catalog:read')")
	public List<AutoServiceDto> listExternalCatalogServices() {
		return catalogFacade.listActiveAutoServices();
	}

	@GetMapping("/providers")
	@PreAuthorize("hasAuthority('providers:read')")
	public PagedModel<ProviderSummary> searchExternalProviders(@RequestParam(required = false) Long serviceId,
			@RequestParam(required = false) String governorate, @RequestParam(required = false) Boolean atHome,
			@RequestParam(required = false) String q, @PageableDefault(size = 20) Pageable pageable) {
		return new PagedModel<>(providerFacade.searchProviders(serviceId, governorate, atHome, q, pageable));
	}

}
