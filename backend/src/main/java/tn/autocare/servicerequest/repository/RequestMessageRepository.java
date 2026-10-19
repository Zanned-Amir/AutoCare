package tn.autocare.servicerequest.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.servicerequest.entity.RequestMessage;

public interface RequestMessageRepository extends JpaRepository<RequestMessage, Long> {

	List<RequestMessage> findAllByServiceRequestIdOrderByIdAsc(Long serviceRequestId);

}
