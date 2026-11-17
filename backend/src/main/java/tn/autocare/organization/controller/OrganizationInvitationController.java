package tn.autocare.organization.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.organization.dto.AcceptInvitationResponse;
import tn.autocare.organization.dto.InvitationPreviewResponse;
import tn.autocare.organization.dto.InvitationResponse;
import tn.autocare.organization.dto.InvitationTokenRequest;
import tn.autocare.organization.dto.InviteMemberRequest;
import tn.autocare.organization.service.OrganizationInvitationService;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Organization invitations")
@RestController
@RequiredArgsConstructor
public class OrganizationInvitationController {

	private static final String CAN_READ = "@orgPerm.has(#organizationId, '" + OrganizationPermissions.MEMBER_READ
			+ "')";

	private static final String CAN_MANAGE = "@orgPerm.has(#organizationId, '" + OrganizationPermissions.MEMBER_MANAGE
			+ "')";

	private final OrganizationInvitationService invitationService;

	@GetMapping("/organizations/{organizationId}/invitations")
	@PreAuthorize(CAN_READ)
	public List<InvitationResponse> listPendingInvitations(@PathVariable Long organizationId) {
		return invitationService.listPendingInvitations(organizationId);
	}

	@PostMapping("/organizations/{organizationId}/invitations")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_MANAGE)
	public InvitationResponse inviteMember(@PathVariable Long organizationId,
			@Valid @RequestBody InviteMemberRequest request) {
		return invitationService.inviteMember(CurrentUser.id(), organizationId, request);
	}

	@DeleteMapping("/organizations/{organizationId}/invitations/{invitationId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_MANAGE)
	public void revokeInvitation(@PathVariable Long organizationId, @PathVariable Long invitationId) {
		invitationService.revokeInvitation(organizationId, invitationId);
	}

	@PostMapping("/organization-invitations/preview")
	public InvitationPreviewResponse previewInvitation(@Valid @RequestBody InvitationTokenRequest request) {
		return invitationService.previewInvitation(request.token());
	}

	@PostMapping("/organization-invitations/accept")
	public AcceptInvitationResponse acceptInvitation(@Valid @RequestBody InvitationTokenRequest request) {
		return invitationService.acceptInvitation(CurrentUser.id(), request.token());
	}

}
