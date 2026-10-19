package tn.autocare.servicerequest.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.servicerequest.entity.StatusChange;

public interface StatusChangeRepository extends JpaRepository<StatusChange, Long> {

	List<StatusChange> findAllByServiceRequestIdOrderByIdAsc(Long serviceRequestId);

}
