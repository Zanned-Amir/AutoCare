package tn.autocare.vehicle.api;

import java.util.Optional;

/**
 * What other modules may ask the vehicle module (diagnostic, service requests,
 * maintenance). Implemented by {@code tn.autocare.vehicle.service.VehicleFacadeImpl}.
 */
public interface VehicleFacade {

	Optional<VehicleDto> findVehicle(Long vehicleId);

	VehicleDto getVehicle(Long vehicleId);

	boolean isVehicleOwnedBy(Long vehicleId, Long userId);

	/** Raises the mileage. A lower value than the current one is refused. */
	void updateVehicleMileage(Long vehicleId, int mileage);

}
