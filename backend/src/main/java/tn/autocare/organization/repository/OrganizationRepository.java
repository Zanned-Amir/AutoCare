package tn.autocare.organization.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.organization.entity.Organization;

public interface OrganizationRepository
		extends JpaRepository<Organization, Long>, JpaSpecificationExecutor<Organization> {

	Page<Organization> findAllByStatus(OrganizationStatus status, Pageable pageable);

	List<Organization> findAllByIdInOrderByNameAsc(Collection<Long> ids);

}
