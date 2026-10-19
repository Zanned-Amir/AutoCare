package tn.autocare.organization.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.Governorates;
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.organization.dto.CreateOrganizationRequest;
import tn.autocare.organization.dto.MyOrganizationResponse;
import tn.autocare.organization.dto.OrganizationResponse;
import tn.autocare.organization.dto.UpdateOrganizationRequest;
import tn.autocare.organization.dto.UpdateOrganizationScheduleRequest;
import tn.autocare.organization.service.OrganizationService;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Organizations")
@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
public class OrganizationController {

	private final OrganizationService organizationService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + OrganizationPermissions.ORGANIZATION_CREATE + "')")
	public MyOrganizationResponse createOrganization(@Valid @RequestBody CreateOrganizationRequest request) {
		return organizationService.createOrganization(CurrentUser.id(), request);
	}

	@GetMapping("/mine")
	public List<MyOrganizationResponse> listMyOrganizations() {
		return organizationService.listMyOrganizations(CurrentUser.id());
	}

	@GetMapping("/governorates")
	public List<String> listGovernorates() {
		return Governorates.ALL;
	}

	@GetMapping("/{organizationId}")
	@PreAuthorize("@orgPerm.has(#organizationId, '" + OrganizationPermissions.ORGANIZATION_READ + "')")
	public OrganizationResponse getOrganization(@PathVariable Long organizationId) {
		return organizationService.getOrganization(organizationId);
	}

	/** Opening hours and booking slots. */
	@PutMapping("/{organizationId}/schedule")
	@PreAuthorize("@orgPerm.has(#organizationId, '" + OrganizationPermissions.ORGANIZATION_UPDATE + "')")
	public OrganizationResponse updateOrganizationSchedule(@PathVariable Long organizationId,
			@Valid @RequestBody UpdateOrganizationScheduleRequest request) {
		return organizationService.updateOrganizationSchedule(organizationId, request);
	}

	@PutMapping("/{organizationId}")
	@PreAuthorize("@orgPerm.has(#organizationId, '" + OrganizationPermissions.ORGANIZATION_UPDATE + "')")
	public OrganizationResponse updateOrganization(@PathVariable Long organizationId,
			@Valid @RequestBody UpdateOrganizationRequest request) {
		return organizationService.updateOrganization(organizationId, request);
	}

}
