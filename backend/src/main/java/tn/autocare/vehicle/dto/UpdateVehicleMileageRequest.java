package tn.autocare.vehicle.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateVehicleMileageRequest(@NotNull @Min(0) @Max(2_000_000) Integer mileage) {
}
