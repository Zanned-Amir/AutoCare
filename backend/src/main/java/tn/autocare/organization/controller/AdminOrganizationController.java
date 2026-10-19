package tn.autocare.organization.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.HttpStatus;
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
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.organization.api.OrganizationType;
import tn.autocare.organization.dto.AddMemberRequest;
import tn.autocare.organization.dto.AdminCreateOrganizationRequest;
import tn.autocare.organization.dto.ChangeMemberRoleRequest;
import tn.autocare.organization.dto.ChangeMemberStatusRequest;
import tn.autocare.organization.dto.MemberResponse;
import tn.autocare.organization.dto.OrganizationResponse;
import tn.autocare.organization.dto.UpdateOrganizationRequest;
import tn.autocare.organization.service.MemberService;
import tn.autocare.organization.service.OrganizationService;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.shared.security.PlatformPermissions;

@Tag(name = "Admin - Organizations")
@RestController
@RequestMapping("/admin/organizations")
@RequiredArgsConstructor
@PreAuthorize("@perm.has('" + OrganizationPermissions.ORGANIZATION_APPROVE + "')")
public class AdminOrganizationController {

	private final OrganizationService organizationService;

	private final MemberService memberService;

	private final PlatformPermissions platformPermissions;

	@GetMapping
	public PagedModel<OrganizationResponse> searchOrganizations(
			@RequestParam(required = false) OrganizationStatus status, @RequestParam(required = false) String q,
			@RequestParam(required = false) OrganizationType type, @RequestParam(required = false) String governorate,
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(organizationService.searchOrganizations(status, q, type, governorate, pageable));
	}

	/**
	 * Any staff member with {@code organization:create} opens an organization for an
	 * account (often their own); approving it at once also needs
	 * {@code organization:approve}.
	 */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + OrganizationPermissions.ORGANIZATION_CREATE + "')")
	public OrganizationResponse createOrganization(@Valid @RequestBody AdminCreateOrganizationRequest request) {
		if (request.approve() && !platformPermissions.has(OrganizationPermissions.ORGANIZATION_APPROVE)) {
			throw new AppException(ErrorCode.FORBIDDEN, "Approving needs organization:approve");
		}
		return organizationService.createOrganizationForOwner(CurrentUser.id(), request);
	}

	@PutMapping("/{organizationId}")
	public OrganizationResponse updateOrganization(@PathVariable Long organizationId,
			@Valid @RequestBody UpdateOrganizationRequest request) {
		return organizationService.updateOrganization(organizationId, request);
	}

	@GetMapping("/{organizationId}/members")
	public List<MemberResponse> listOrganizationMembers(@PathVariable Long organizationId) {
		return memberService.listMembers(organizationId);
	}

	@PostMapping("/{organizationId}/members")
	@ResponseStatus(HttpStatus.CREATED)
	public MemberResponse addOrganizationMember(@PathVariable Long organizationId,
			@Valid @RequestBody AddMemberRequest request) {
		return memberService.addMember(CurrentUser.id(), organizationId, request);
	}

	@PutMapping("/{organizationId}/members/{memberId}/role")
	public MemberResponse changeOrganizationMemberRole(@PathVariable Long organizationId, @PathVariable Long memberId,
			@Valid @RequestBody ChangeMemberRoleRequest request) {
		return memberService.changeMemberRole(CurrentUser.id(), organizationId, memberId, request);
	}

	@PutMapping("/{organizationId}/members/{memberId}/status")
	public MemberResponse changeOrganizationMemberStatus(@PathVariable Long organizationId, @PathVariable Long memberId,
			@Valid @RequestBody ChangeMemberStatusRequest request) {
		return memberService.changeMemberStatus(CurrentUser.id(), organizationId, memberId, request);
	}

	@DeleteMapping("/{organizationId}/members/{memberId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeOrganizationMember(@PathVariable Long organizationId, @PathVariable Long memberId) {
		memberService.removeMember(CurrentUser.id(), organizationId, memberId);
	}

	@GetMapping("/{organizationId}")
	public OrganizationResponse getOrganization(@PathVariable Long organizationId) {
		return organizationService.getOrganization(organizationId);
	}

	@PostMapping("/{organizationId}/approve")
	public OrganizationResponse approveOrganization(@PathVariable Long organizationId) {
		return organizationService.approveOrganization(CurrentUser.id(), organizationId);
	}

	@PostMapping("/{organizationId}/suspend")
	public OrganizationResponse suspendOrganization(@PathVariable Long organizationId) {
		return organizationService.suspendOrganization(CurrentUser.id(), organizationId);
	}

}
