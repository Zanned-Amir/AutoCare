package tn.autocare.vehicle.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.shared.exception.AppException;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.api.VehicleFacade;
import tn.autocare.vehicle.mapper.VehicleMapper;
import tn.autocare.vehicle.repository.VehicleRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class VehicleFacadeImpl implements VehicleFacade {

	private final VehicleRepository vehicleRepository;

	private final VehicleMapper vehicleMapper;

	@Override
	public Optional<VehicleDto> findVehicle(Long vehicleId) {
		return vehicleRepository.findById(vehicleId).map(vehicleMapper::toDto);
	}

	@Override
	public VehicleDto getVehicle(Long vehicleId) {
		return findVehicle(vehicleId).orElseThrow(() -> AppException.notFound("Vehicle", vehicleId));
	}

	@Override
	public boolean isVehicleOwnedBy(Long vehicleId, Long userId) {
		return vehicleRepository.existsByIdAndOwnerId(vehicleId, userId);
	}

	@Override
	@Transactional
	public void updateVehicleMileage(Long vehicleId, int mileage) {
		vehicleRepository.findById(vehicleId)
			.orElseThrow(() -> AppException.notFound("Vehicle", vehicleId))
			.updateMileage(mileage);
	}

}
