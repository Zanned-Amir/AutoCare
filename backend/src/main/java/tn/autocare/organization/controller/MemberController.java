package tn.autocare.organization.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.organization.dto.AddMemberRequest;
import tn.autocare.organization.dto.ChangeMemberPermissionsRequest;
import tn.autocare.organization.dto.ChangeMemberRoleRequest;
import tn.autocare.organization.dto.ChangeMemberStatusRequest;
import tn.autocare.organization.dto.MemberResponse;
import tn.autocare.organization.service.MemberService;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Organization members")
@RestController
@RequestMapping("/organizations/{organizationId}/members")
@RequiredArgsConstructor
public class MemberController {

	private static final String CAN_READ = "@orgPerm.has(#organizationId, '" + OrganizationPermissions.MEMBER_READ
			+ "')";

	private static final String CAN_MANAGE = "@orgPerm.has(#organizationId, '" + OrganizationPermissions.MEMBER_MANAGE
			+ "')";

	private final MemberService memberService;

	@GetMapping
	@PreAuthorize(CAN_READ)
	public List<MemberResponse> listMembers(@PathVariable Long organizationId) {
		return memberService.listMembers(organizationId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_MANAGE)
	public MemberResponse addMember(@PathVariable Long organizationId, @Valid @RequestBody AddMemberRequest request) {
		return memberService.addMember(CurrentUser.id(), organizationId, request);
	}

	@PutMapping("/{memberId}/role")
	@PreAuthorize(CAN_MANAGE)
	public MemberResponse changeMemberRole(@PathVariable Long organizationId, @PathVariable Long memberId,
			@Valid @RequestBody ChangeMemberRoleRequest request) {
		return memberService.changeMemberRole(CurrentUser.id(), organizationId, memberId, request);
	}

	@PutMapping("/{memberId}/permissions")
	@PreAuthorize(CAN_MANAGE)
	public MemberResponse changeMemberPermissions(@PathVariable Long organizationId, @PathVariable Long memberId,
			@Valid @RequestBody ChangeMemberPermissionsRequest request) {
		return memberService.changeMemberPermissions(CurrentUser.id(), organizationId, memberId, request);
	}

	@PutMapping("/{memberId}/status")
	@PreAuthorize(CAN_MANAGE)
	public MemberResponse changeMemberStatus(@PathVariable Long organizationId, @PathVariable Long memberId,
			@Valid @RequestBody ChangeMemberStatusRequest request) {
		return memberService.changeMemberStatus(CurrentUser.id(), organizationId, memberId, request);
	}

	@DeleteMapping("/{memberId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_MANAGE)
	public void removeMember(@PathVariable Long organizationId, @PathVariable Long memberId) {
		memberService.removeMember(CurrentUser.id(), organizationId, memberId);
	}

}
