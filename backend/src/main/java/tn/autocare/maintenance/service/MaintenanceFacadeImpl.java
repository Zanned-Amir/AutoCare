package tn.autocare.maintenance.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.maintenance.api.MaintenanceFacade;
import tn.autocare.maintenance.api.MaintenanceRecordDto;
import tn.autocare.maintenance.repository.MaintenanceRecordRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class MaintenanceFacadeImpl implements MaintenanceFacade {

	private final MaintenanceRecordRepository recordRepository;

	@Override
	public List<MaintenanceRecordDto> listVehicleHistory(Long vehicleId) {
		return recordRepository.findAllByVehicleIdOrderByDateDescIdDesc(vehicleId)
			.stream()
			.map(r -> new MaintenanceRecordDto(r.getId(), r.getVehicleId(), r.getServiceId(), r.getOrganizationId(),
					r.getServiceRequestId(), r.getDate(), r.getMileage(), r.getDescription(), r.getResult(),
					r.getRecommendations()))
			.toList();
	}

}
