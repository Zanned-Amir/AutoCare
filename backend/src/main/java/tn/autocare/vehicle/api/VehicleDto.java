package tn.autocare.vehicle.api;

import java.time.Instant;

public record VehicleDto(Long id, Long ownerId, String brand, String model, int year, FuelType fuelType, String engine,
		int mileage, String plate, String vin, Instant createdAt) {
}
