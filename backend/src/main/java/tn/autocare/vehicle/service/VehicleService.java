package tn.autocare.vehicle.service;

import java.time.Year;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.file.api.FileFacade;
import tn.autocare.file.api.FileOwnerType;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.vehicle.api.VehicleDeleted;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.dto.CreateVehicleRequest;
import tn.autocare.vehicle.dto.UpdateVehicleMileageRequest;
import tn.autocare.vehicle.dto.UpdateVehicleRequest;
import tn.autocare.vehicle.entity.Vehicle;
import tn.autocare.vehicle.mapper.VehicleMapper;
import tn.autocare.vehicle.repository.VehicleRepository;

/**
 * A client's own vehicles. Every method takes the current user id and only touches that
 * user's vehicles; someone else's vehicle answers 404 so its existence does not leak.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VehicleService {

	private final VehicleRepository vehicleRepository;

	private final VehicleMapper vehicleMapper;

	private final FileFacade fileFacade;

	private final ApplicationEventPublisher events;

	private final VehicleCatalogService catalogService;

	public List<VehicleDto> listMyVehicles(Long ownerId) {
		return vehicleRepository.findAllByOwnerIdOrderByCreatedAtDesc(ownerId)
				.stream()
				.map(vehicleMapper::toDto)
				.toList();
	}

	public VehicleDto getMyVehicle(Long ownerId, Long vehicleId) {
		return vehicleMapper.toDto(findMyVehicleOrThrow(ownerId, vehicleId));
	}

	@Transactional
	public VehicleDto createVehicle(Long ownerId, CreateVehicleRequest request) {
		checkYear(request.year());
		Vehicle vehicle = Vehicle.register(ownerId, catalogService.canonicalBrand(request.brand()),
				catalogService.canonicalModel(request.brand(), request.model()), request.year(), request.fuelType(),
				request.engine(), request.mileage(), request.plate(), request.vin());
		return vehicleMapper.toDto(vehicleRepository.save(vehicle));
	}

	@Transactional
	public VehicleDto updateVehicle(Long ownerId, Long vehicleId, UpdateVehicleRequest request) {
		checkYear(request.year());
		Vehicle vehicle = findMyVehicleOrThrow(ownerId, vehicleId);
		vehicle.updateDetails(catalogService.canonicalBrand(request.brand()),
				catalogService.canonicalModel(request.brand(), request.model()), request.year(), request.fuelType(),
				request.engine(), request.plate(), request.vin());
		vehicle.updateMileage(request.mileage());
		return vehicleMapper.toDto(vehicle);
	}

	@Transactional
	public VehicleDto updateVehicleMileage(Long ownerId, Long vehicleId, UpdateVehicleMileageRequest request) {
		Vehicle vehicle = findMyVehicleOrThrow(ownerId, vehicleId);
		vehicle.updateMileage(request.mileage());
		return vehicleMapper.toDto(vehicle);
	}

	@Transactional
	public void deleteVehicle(Long ownerId, Long vehicleId) {
		vehicleRepository.delete(findMyVehicleOrThrow(ownerId, vehicleId));
		fileFacade.deleteOwnerFiles(FileOwnerType.VEHICLE, vehicleId);
		events.publishEvent(new VehicleDeleted(vehicleId, ownerId));
	}

	/** 404 unless the vehicle belongs to the user. */
	public void checkMyVehicle(Long ownerId, Long vehicleId) {
		if (!vehicleRepository.existsByIdAndOwnerId(vehicleId, ownerId)) {
			throw AppException.notFound("Vehicle", vehicleId);
		}
	}

	private Vehicle findMyVehicleOrThrow(Long ownerId, Long vehicleId) {
		return vehicleRepository.findByIdAndOwnerId(vehicleId, ownerId)
				.orElseThrow(() -> AppException.notFound("Vehicle", vehicleId));
	}

	private static void checkYear(int year) {
		// Next year's models are sold from autumn, so allow current year + 1.
		if (year > Year.now().getValue() + 1) {
			throw new AppException(ErrorCode.VEHICLE_YEAR_INVALID, "Year cannot be in the future");
		}
	}

}