package tn.autocare.organization.service;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.organization.api.OrganizationMemberChanged;
import tn.autocare.organization.api.OrganizationMemberChanged.Change;
import tn.autocare.organization.dto.AddMemberRequest;
import tn.autocare.organization.dto.ChangeMemberPermissionsRequest;
import tn.autocare.organization.dto.ChangeMemberRoleRequest;
import tn.autocare.organization.dto.ChangeMemberStatusRequest;
import tn.autocare.organization.dto.MemberResponse;
import tn.autocare.organization.entity.MemberRoleKey;
import tn.autocare.organization.entity.Organization;
import tn.autocare.organization.entity.OrganizationMember;
import tn.autocare.organization.repository.OrganizationMemberRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

	private final OrganizationMemberRepository memberRepository;

	private final OrganizationService organizationService;

	private final MemberPermissionCache memberPermissionCache;

	private final AuthFacade authFacade;

	private final ApplicationEventPublisher events;

	public List<MemberResponse> listMembers(Long organizationId) {
		List<OrganizationMember> members = memberRepository.findAllByOrganizationIdOrderByJoinedAtAsc(organizationId);
		Map<Long, UserSummary> users = authFacade
			.listUsers(members.stream().map(OrganizationMember::getUserId).toList())
			.stream()
			.collect(Collectors.toMap(UserSummary::id, Function.identity()));
		return members.stream().map(member -> toResponse(member, users.get(member.getUserId()))).toList();
	}

	@Transactional
	public MemberResponse addMember(Long actorId, Long organizationId, AddMemberRequest request) {
		Organization organization = organizationService.findOrganizationOrThrow(organizationId);
		checkRoleFits(request.roleKey(), organization);
		UserSummary user = authFacade.findUserByEmail(request.email())
			.orElseThrow(() -> new AppException(ErrorCode.MEMBER_USER_NOT_FOUND, "No account uses this email"));
		if (memberRepository.existsByOrganizationIdAndUserId(organizationId, user.id())) {
			throw new AppException(ErrorCode.MEMBER_ALREADY_EXISTS, "This person is already a member");
		}
		OrganizationMember member = memberRepository
			.save(OrganizationMember.join(organizationId, user.id(), request.roleKey()));
		memberPermissionCache.evict(organizationId, user.id());
		publishChanged(organizationId, member, actorId, Change.ADDED, request.roleKey().name());
		return toResponse(member, user);
	}

	@Transactional
	public MemberResponse changeMemberRole(Long actorId, Long organizationId, Long memberId,
			ChangeMemberRoleRequest request) {
		checkRoleFits(request.roleKey(), organizationService.findOrganizationOrThrow(organizationId));
		return changeMember(organizationId, memberId, member -> member.changeRole(request.roleKey()), actorId,
				Change.ROLE_CHANGED, request.roleKey().name());
	}

	@Transactional
	public MemberResponse changeMemberPermissions(Long actorId, Long organizationId, Long memberId,
			ChangeMemberPermissionsRequest request) {
		return changeMember(organizationId, memberId, member -> member.changePermissions(request.permissions()),
				actorId, Change.PERMISSIONS_CHANGED, null);
	}

	@Transactional
	public MemberResponse changeMemberStatus(Long actorId, Long organizationId, Long memberId,
			ChangeMemberStatusRequest request) {
		return changeMember(organizationId, memberId, member -> member.changeStatus(request.status()), actorId,
				Change.STATUS_CHANGED, request.status().name());
	}

	@Transactional
	public void removeMember(Long actorId, Long organizationId, Long memberId) {
		OrganizationMember member = findMemberOrThrow(organizationId, memberId);
		List<OrganizationMember> remaining = memberRepository.findAllByOrganizationIdOrderByJoinedAtAsc(organizationId)
			.stream()
			.filter(other -> !other.getId().equals(memberId))
			.toList();
		checkStillManaged(remaining);
		memberRepository.delete(member);
		memberPermissionCache.evict(organizationId, member.getUserId());
		publishChanged(organizationId, member, actorId, Change.REMOVED, null);
	}

	private MemberResponse changeMember(Long organizationId, Long memberId, Consumer<OrganizationMember> change,
			Long actorId, Change kind, @Nullable String value) {
		List<OrganizationMember> members = memberRepository.findAllByOrganizationIdOrderByJoinedAtAsc(organizationId);
		OrganizationMember member = members.stream()
			.filter(candidate -> candidate.getId().equals(memberId))
			.findFirst()
			.orElseThrow(() -> AppException.notFound("Member", memberId));
		change.accept(member);
		// The entities are managed: if the check fails the transaction rolls back and
		// nothing is saved.
		checkStillManaged(members);
		memberPermissionCache.evict(organizationId, member.getUserId());
		publishChanged(organizationId, member, actorId, kind, value);
		UserSummary user = authFacade.findUser(member.getUserId()).orElse(null);
		return toResponse(member, user);
	}

	private void publishChanged(Long organizationId, OrganizationMember member, Long actorId, Change change,
			@Nullable String value) {
		events.publishEvent(new OrganizationMemberChanged(organizationId, member.getUserId(), actorId, change, value));
	}

	private OrganizationMember findMemberOrThrow(Long organizationId, Long memberId) {
		return memberRepository.findByIdAndOrganizationId(memberId, organizationId)
			.orElseThrow(() -> AppException.notFound("Member", memberId));
	}

	private static void checkStillManaged(List<OrganizationMember> members) {
		if (members.stream().noneMatch(OrganizationMember::canManageMembers)) {
			throw new AppException(ErrorCode.LAST_MEMBER_MANAGER,
					"The organization must keep at least one active member who can manage members");
		}
	}

	private static void checkRoleFits(MemberRoleKey roleKey, Organization organization) {
		if (!roleKey.fits(organization.getType())) {
			throw new AppException(ErrorCode.MEMBER_ROLE_TYPE_MISMATCH,
					"Role " + roleKey + " cannot be used in a " + organization.getType() + " organization");
		}
	}

	private static MemberResponse toResponse(OrganizationMember member, UserSummary user) {
		return new MemberResponse(member.getId(), member.getUserId(), user == null ? null : user.fullName(),
				user == null ? null : user.email(), member.getStatus(), member.getRoleKey(), member.getPermissions(),
				member.getJoinedAt());
	}

}
