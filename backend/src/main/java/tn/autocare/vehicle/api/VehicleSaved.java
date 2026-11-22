package tn.autocare.vehicle.api;

/** A vehicle was created or changed (details or mileage). Consumed by assistant. */
public record VehicleSaved(Long vehicleId, Long ownerId, String brand, String model, int year, int mileage) {

	public static VehicleSaved of(VehicleDto vehicle) {
		return new VehicleSaved(vehicle.id(), vehicle.ownerId(), vehicle.brand(), vehicle.model(), vehicle.year(),
				vehicle.mileage());
	}

}
