package tn.autocare.servicerequest.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.api.ServiceRequestDto;
import tn.autocare.servicerequest.api.ServiceRequestFacade;
import tn.autocare.servicerequest.repository.ServiceRequestRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class ServiceRequestFacadeImpl implements ServiceRequestFacade {

	private final ServiceRequestRepository requestRepository;

	@Override
	public Optional<ServiceRequestDto> findServiceRequest(Long serviceRequestId) {
		return requestRepository.findById(serviceRequestId)
			.map(r -> new ServiceRequestDto(r.getId(), r.getUserId(), r.getVehicleId(), r.getServiceId(),
					r.getOrganizationId(), r.getDesiredDate(), r.getLocationType(), r.getStatus()));
	}

	@Override
	public boolean isServiceRequestCompletedBy(Long serviceRequestId, Long userId) {
		return requestRepository.existsByIdAndUserIdAndStatus(serviceRequestId, userId, RequestStatus.COMPLETED);
	}

}
