package tn.autocare.servicerequest.api;

import java.util.Optional;

public interface ServiceRequestFacade {

	Optional<ServiceRequestDto> findServiceRequest(Long serviceRequestId);

	boolean isServiceRequestCompletedBy(Long serviceRequestId, Long userId);

}
