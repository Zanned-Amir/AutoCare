package tn.autocare.organization.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.organization.api.Governorates;
import tn.autocare.organization.api.OrganizationApproved;
import tn.autocare.organization.api.OrganizationProfileChanged;
import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.organization.api.OrganizationSuspended;
import tn.autocare.organization.api.OrganizationType;
import tn.autocare.organization.dto.AdminCreateOrganizationRequest;
import tn.autocare.organization.dto.CreateOrganizationRequest;
import tn.autocare.organization.dto.MyOrganizationResponse;
import tn.autocare.organization.dto.OrganizationResponse;
import tn.autocare.organization.dto.UpdateOrganizationRequest;
import tn.autocare.organization.dto.UpdateOrganizationScheduleRequest;
import tn.autocare.organization.dto.UserMembershipResponse;
import tn.autocare.organization.entity.MemberRoleKey;
import tn.autocare.organization.entity.MemberStatus;
import tn.autocare.organization.entity.Organization;
import tn.autocare.organization.entity.OrganizationMember;
import tn.autocare.organization.mapper.OrganizationMapper;
import tn.autocare.organization.repository.OrganizationMemberRepository;
import tn.autocare.organization.repository.OrganizationRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationService {

	private final OrganizationRepository organizationRepository;

	private final OrganizationMemberRepository memberRepository;

	private final OrganizationMapper organizationMapper;

	private final MemberPermissionCache memberPermissionCache;

	private final ApplicationEventPublisher events;

	private final AuthFacade authFacade;

	/**
	 * The creator becomes the owner. The organization stays PENDING until an admin
	 * approves it.
	 */
	@Transactional
	public MyOrganizationResponse createOrganization(Long userId, CreateOrganizationRequest request) {
		checkGovernorate(request.governorate());
		Organization organization = organizationRepository
			.save(Organization.create(userId, request.type(), request.toDetails()));
		OrganizationMember owner = memberRepository
			.save(OrganizationMember.join(organization.getId(), userId, MemberRoleKey.ownerOf(request.type())));
		memberPermissionCache.evict(organization.getId(), userId);
		publishProfileChanged(organization);
		return new MyOrganizationResponse(organizationMapper.toResponse(organization), owner.getRoleKey(),
				owner.getPermissions());
	}

	/**
	 * Same as a self sign-up, with the owner found by e-mail; approved at once when
	 * asked.
	 */
	@Transactional
	public OrganizationResponse createOrganizationForOwner(Long adminId, AdminCreateOrganizationRequest request) {
		UserSummary owner = authFacade.findUserByEmail(request.ownerEmail())
			.orElseThrow(() -> new AppException(ErrorCode.MEMBER_USER_NOT_FOUND, "No account uses this email"));
		MyOrganizationResponse created = createOrganization(owner.id(), request.organization());
		return request.approve() ? approveOrganization(adminId, created.organization().id()) : created.organization();
	}

	public List<MyOrganizationResponse> listMyOrganizations(Long userId) {
		List<OrganizationMember> memberships = memberRepository.findAllByUserIdAndStatus(userId, MemberStatus.ACTIVE);
		Map<Long, OrganizationMember> byOrganization = memberships.stream()
			.collect(Collectors.toMap(OrganizationMember::getOrganizationId, Function.identity()));
		return organizationRepository.findAllByIdInOrderByNameAsc(byOrganization.keySet())
			.stream()
			.map(organization -> {
				OrganizationMember member = byOrganization.get(organization.getId());
				return new MyOrganizationResponse(organizationMapper.toResponse(organization), member.getRoleKey(),
						member.getPermissions());
			})
			.toList();
	}

	public List<UserMembershipResponse> listUserMemberships(Long userId) {
		List<OrganizationMember> memberships = memberRepository.findAllByUserIdOrderByJoinedAtAsc(userId);
		Map<Long, Organization> organizations = organizationRepository
			.findAllById(memberships.stream().map(OrganizationMember::getOrganizationId).toList())
			.stream()
			.collect(Collectors.toMap(Organization::getId, Function.identity()));
		return memberships.stream()
			.filter(member -> organizations.containsKey(member.getOrganizationId()))
			.map(member -> new UserMembershipResponse(member.getId(),
					organizationMapper.toResponse(organizations.get(member.getOrganizationId())), member.getRoleKey(),
					member.getStatus(), member.getJoinedAt()))
			.toList();
	}

	public OrganizationResponse getOrganization(Long organizationId) {
		return organizationMapper.toResponse(findOrganizationOrThrow(organizationId));
	}

	@Transactional
	public OrganizationResponse updateOrganization(Long organizationId, UpdateOrganizationRequest request) {
		checkGovernorate(request.governorate());
		Organization organization = findOrganizationOrThrow(organizationId);
		organization.updateDetails(request.toDetails());
		publishProfileChanged(organization);
		return organizationMapper.toResponse(organization);
	}

	/** {@code query} matches the name, city or phone. */
	@Transactional
	public OrganizationResponse updateOrganizationSchedule(Long organizationId,
			UpdateOrganizationScheduleRequest request) {
		Organization organization = findOrganizationOrThrow(organizationId);
		organization.updateSchedule(request.workingHours(), request.slotMinutes(), request.slotCapacity());
		return organizationMapper.toResponse(organization);
	}

	public Page<OrganizationResponse> searchOrganizations(@Nullable OrganizationStatus status, @Nullable String query,
			@Nullable OrganizationType type, @Nullable String governorate, Pageable pageable) {
		Specification<Organization> filters = (root, criteria, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (status != null) {
				predicates.add(cb.equal(root.get("status"), status));
			}
			if (type != null) {
				predicates.add(cb.equal(root.get("type"), type));
			}
			if (governorate != null && !governorate.isBlank()) {
				predicates.add(cb.equal(root.get("governorate"), governorate));
			}
			if (query != null && !query.isBlank()) {
				String like = "%" + query.trim().toLowerCase() + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("name")), like),
						cb.like(cb.lower(root.get("city")), like), cb.like(root.get("phone"), like)));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
		return organizationRepository.findAll(filters, pageable).map(organizationMapper::toResponse);
	}

	@Transactional
	public OrganizationResponse approveOrganization(Long adminId, Long organizationId) {
		Organization organization = findOrganizationOrThrow(organizationId);
		organization.approve();
		publishProfileChanged(organization);
		events.publishEvent(new OrganizationApproved(organization.getId(), organization.getOwnerId(), adminId));
		return organizationMapper.toResponse(organization);
	}

	@Transactional
	public OrganizationResponse suspendOrganization(Long adminId, Long organizationId) {
		Organization organization = findOrganizationOrThrow(organizationId);
		organization.suspend();
		publishProfileChanged(organization);
		events.publishEvent(new OrganizationSuspended(organization.getId(), adminId));
		return organizationMapper.toResponse(organization);
	}

	Organization findOrganizationOrThrow(Long organizationId) {
		return organizationRepository.findById(organizationId)
			.orElseThrow(() -> AppException.notFound("Organization", organizationId));
	}

	private void publishProfileChanged(Organization organization) {
		events.publishEvent(new OrganizationProfileChanged(organization.getId(), organization.getName(),
				organization.getType(), organization.getStatus(), organization.getDescription(),
				organization.getPhone(), organization.getGovernorate(), organization.getCity(),
				organization.getAddress(), organization.getServiceZone(), organization.getLatitude(),
				organization.getLongitude(), Instant.now()));
	}

	private static void checkGovernorate(String governorate) {
		if (!Governorates.isValid(governorate)) {
			throw new AppException(ErrorCode.ORGANIZATION_GOVERNORATE_INVALID, "Unknown governorate " + governorate);
		}
	}

}
