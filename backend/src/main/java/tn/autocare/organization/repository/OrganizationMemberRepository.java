package tn.autocare.organization.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.organization.entity.MemberStatus;
import tn.autocare.organization.entity.OrganizationMember;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, Long> {

	Optional<OrganizationMember> findByOrganizationIdAndUserId(Long organizationId, Long userId);

	Optional<OrganizationMember> findByIdAndOrganizationId(Long id, Long organizationId);

	List<OrganizationMember> findAllByOrganizationIdOrderByJoinedAtAsc(Long organizationId);

	List<OrganizationMember> findAllByOrganizationIdAndStatus(Long organizationId, MemberStatus status);

	List<OrganizationMember> findAllByUserIdAndStatus(Long userId, MemberStatus status);

	List<OrganizationMember> findAllByUserIdOrderByJoinedAtAsc(Long userId);

	boolean existsByOrganizationIdAndUserId(Long organizationId, Long userId);

}
