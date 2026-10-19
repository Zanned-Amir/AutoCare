package tn.autocare.vehicle.api;

/** Consumed by maintenance, which removes the vehicle's history. */
public record VehicleDeleted(Long vehicleId, Long ownerId) {
}
