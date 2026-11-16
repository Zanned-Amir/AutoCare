package tn.autocare.organization.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.organization.entity.InvitationStatus;
import tn.autocare.organization.entity.OrganizationInvitation;

public interface OrganizationInvitationRepository extends JpaRepository<OrganizationInvitation, Long> {

	Optional<OrganizationInvitation> findByTokenHash(String tokenHash);

	Optional<OrganizationInvitation> findByIdAndOrganizationId(Long id, Long organizationId);

	List<OrganizationInvitation> findAllByOrganizationIdAndStatusOrderByCreatedAtDesc(Long organizationId,
			InvitationStatus status);

	List<OrganizationInvitation> findAllByOrganizationIdAndEmailAndStatus(Long organizationId, String email,
			InvitationStatus status);

}
