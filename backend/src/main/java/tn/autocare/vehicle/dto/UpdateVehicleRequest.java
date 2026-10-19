package tn.autocare.vehicle.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import tn.autocare.vehicle.api.FuelType;

public record UpdateVehicleRequest(@NotBlank @Size(max = 60) String brand, @NotBlank @Size(max = 60) String model,
		@NotNull @Min(1950) Integer year, @NotNull FuelType fuelType, @Size(max = 60) String engine,
		@NotNull @Min(0) @Max(2_000_000) Integer mileage,
		@Size(max = 20) @Pattern(regexp = "^[0-9A-Za-z ]{4,20}$", message = "must be a licence plate") String plate,
		@Pattern(regexp = "^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$", message = "must be a 17-character VIN") String vin) {
}
