package tn.autocare.vehicle.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.persistence.BaseEntity;
import tn.autocare.vehicle.api.FuelType;

@Getter
@Entity
@Table(schema = "vehicle", name = "vehicles")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Vehicle extends BaseEntity {

	/** User id from the auth module (no JPA relation across modules). */
	@Column(name = "owner_id", nullable = false)
	private Long ownerId;

	@Column(nullable = false, length = 60)
	private String brand;

	@Column(nullable = false, length = 60)
	private String model;

	@Column(nullable = false)
	private int year;

	@Enumerated(EnumType.STRING)
	@Column(name = "fuel_type", nullable = false, length = 20)
	private FuelType fuelType;

	@Column(length = 60)
	private String engine;

	@Column(nullable = false)
	private int mileage;

	/** Licence plate, upper case with single spaces ("123 TU 4567"). */
	@Column(length = 20)
	private String plate;

	@Column(length = 17)
	private String vin;

	public static Vehicle register(Long ownerId, String brand, String model, int year, FuelType fuelType, String engine,
			int mileage, String plate, String vin) {
		Vehicle vehicle = new Vehicle();
		vehicle.ownerId = ownerId;
		vehicle.mileage = mileage;
		vehicle.updateDetails(brand, model, year, fuelType, engine, plate, vin);
		return vehicle;
	}

	public void updateDetails(String brand, String model, int year, FuelType fuelType, String engine, String plate,
			String vin) {
		this.brand = brand.trim();
		this.model = model.trim();
		this.year = year;
		this.fuelType = fuelType;
		this.engine = engine == null || engine.isBlank() ? null : engine.trim();
		this.plate = normalize(plate);
		this.vin = normalize(vin);
	}

	private static String normalize(String value) {
		return value == null || value.isBlank() ? null : value.trim().replaceAll("\\s+", " ").toUpperCase();
	}

	// An odometer only goes up; a lower value is almost always a typo.
	public void updateMileage(int newMileage) {
		if (newMileage < mileage) {
			throw new AppException(ErrorCode.VEHICLE_MILEAGE_DECREASED,
					"Mileage cannot be lower than the current value (" + mileage + " km)");
		}
		this.mileage = newMileage;
	}

	public boolean isOwnedBy(Long userId) {
		return ownerId.equals(userId);
	}

}
