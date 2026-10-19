package tn.autocare.catalog.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogPermissions;
import tn.autocare.catalog.dto.CreateAutoServiceRequest;
import tn.autocare.catalog.dto.UpdateAutoServiceRequest;
import tn.autocare.catalog.service.CatalogService;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Admin - Catalog")
@RestController
@RequestMapping("/admin/catalog/services")
@RequiredArgsConstructor
public class AdminCatalogController {

	private final CatalogService catalogService;

	@GetMapping
	@PreAuthorize("@perm.has('" + CatalogPermissions.SERVICE_READ + "')")
	public PagedModel<AutoServiceDto> searchAutoServices(@RequestParam(required = false) String q,
			@RequestParam(required = false) Boolean active,
			@PageableDefault(size = 20, sort = "name") Pageable pageable) {
		return new PagedModel<>(catalogService.searchAutoServices(q, active, pageable));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + CatalogPermissions.SERVICE_MANAGE + "')")
	public AutoServiceDto createAutoService(@Valid @RequestBody CreateAutoServiceRequest request) {
		return catalogService.createAutoService(request);
	}

	@PutMapping("/{autoServiceId}")
	@PreAuthorize("@perm.has('" + CatalogPermissions.SERVICE_MANAGE + "')")
	public AutoServiceDto updateAutoService(@PathVariable Long autoServiceId,
			@Valid @RequestBody UpdateAutoServiceRequest request) {
		return catalogService.updateAutoService(CurrentUser.id(), autoServiceId, request);
	}

	@PostMapping("/{autoServiceId}/deactivate")
	@PreAuthorize("@perm.has('" + CatalogPermissions.SERVICE_MANAGE + "')")
	public AutoServiceDto deactivateAutoService(@PathVariable Long autoServiceId) {
		return catalogService.deactivateAutoService(CurrentUser.id(), autoServiceId);
	}

	@PostMapping("/{autoServiceId}/reactivate")
	@PreAuthorize("@perm.has('" + CatalogPermissions.SERVICE_MANAGE + "')")
	public AutoServiceDto reactivateAutoService(@PathVariable Long autoServiceId) {
		return catalogService.reactivateAutoService(CurrentUser.id(), autoServiceId);
	}

}
