package tn.autocare.organization.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.BookingSchedule;
import tn.autocare.organization.api.OrganizationFacade;
import tn.autocare.organization.api.OrganizationSummary;
import tn.autocare.organization.entity.MemberStatus;
import tn.autocare.organization.entity.OrganizationMember;
import tn.autocare.organization.mapper.OrganizationMapper;
import tn.autocare.organization.repository.OrganizationMemberRepository;
import tn.autocare.organization.repository.OrganizationRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.security.PermissionMatcher;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class OrganizationFacadeImpl implements OrganizationFacade {

	private final OrganizationRepository organizationRepository;

	private final OrganizationMemberRepository memberRepository;

	private final OrganizationMapper organizationMapper;

	private final MemberPermissionCache memberPermissionCache;

	@Override
	public Optional<OrganizationSummary> findOrganization(Long organizationId) {
		return organizationRepository.findById(organizationId).map(organizationMapper::toSummary);
	}

	@Override
	public OrganizationSummary getOrganization(Long organizationId) {
		return findOrganization(organizationId)
			.orElseThrow(() -> AppException.notFound("Organization", organizationId));
	}

	@Override
	public BookingSchedule getBookingSchedule(Long organizationId) {
		var organization = organizationRepository.findById(organizationId)
			.orElseThrow(() -> AppException.notFound("Organization", organizationId));
		return new BookingSchedule(java.util.Map.copyOf(organization.getWorkingHours()), organization.getSlotMinutes(),
				organization.getSlotCapacity());
	}

	@Override
	public boolean hasMemberPermission(Long organizationId, Long userId, String permission) {
		return PermissionMatcher.grants(memberPermissionCache.getPermissions(organizationId, userId), permission);
	}

	@Override
	public List<Long> listMemberUserIdsWithPermission(Long organizationId, String permission) {
		return memberRepository.findAllByOrganizationIdAndStatus(organizationId, MemberStatus.ACTIVE)
			.stream()
			.filter(member -> PermissionMatcher.grants(member.getPermissions(), permission))
			.map(OrganizationMember::getUserId)
			.toList();
	}

}
