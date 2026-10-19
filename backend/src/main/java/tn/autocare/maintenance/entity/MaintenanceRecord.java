package tn.autocare.maintenance.entity;

import java.time.LocalDate;

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

/** One entry of a vehicle's history, with the report of the work. */
@Getter
@Entity
@Table(schema = "maintenance", name = "records")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceRecord extends BaseEntity {

	@Column(name = "vehicle_id", nullable = false)
	private Long vehicleId;

	@Column(name = "service_id")
	private Long serviceId;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(name = "service_request_id", unique = true)
	private Long serviceRequestId;

	@Column(nullable = false)
	private LocalDate date;

	@Column(nullable = false)
	private int mileage;

	@Column(nullable = false, length = 500)
	private String description;

	@Column(length = 2000)
	private String result;

	@Column(length = 2000)
	private String recommendations;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private RecordSource source;

	@Column(name = "created_by", nullable = false)
	private Long createdBy;

	public static MaintenanceRecord fromServiceRequest(Long serviceRequestId, Long vehicleId, Long serviceId,
			Long organizationId, LocalDate date, int mileage, String description, String result, String recommendations,
			Long createdBy) {
		MaintenanceRecord record = new MaintenanceRecord();
		record.serviceRequestId = serviceRequestId;
		record.vehicleId = vehicleId;
		record.serviceId = serviceId;
		record.organizationId = organizationId;
		record.date = date;
		record.mileage = mileage;
		record.description = description;
		record.result = result;
		record.recommendations = recommendations;
		record.source = RecordSource.SERVICE_REQUEST;
		record.createdBy = createdBy;
		return record;
	}

	public static MaintenanceRecord manual(Long vehicleId, Long createdBy, LocalDate date, int mileage, Long serviceId,
			String description, String result) {
		MaintenanceRecord record = new MaintenanceRecord();
		record.vehicleId = vehicleId;
		record.createdBy = createdBy;
		record.source = RecordSource.MANUAL;
		record.updateManualEntry(date, mileage, serviceId, description, result);
		return record;
	}

	public void updateManualEntry(LocalDate date, int mileage, Long serviceId, String description, String result) {
		checkManual();
		this.date = date;
		this.mileage = mileage;
		this.serviceId = serviceId;
		this.description = description.trim();
		this.result = blankToNull(result);
	}

	/** The provider can complete its report after the request is closed. */
	public void updateReport(String result, String recommendations) {
		this.result = blankToNull(result);
		this.recommendations = blankToNull(recommendations);
	}

	public void checkManual() {
		if (source == RecordSource.SERVICE_REQUEST) {
			throw new AppException(ErrorCode.MAINTENANCE_RECORD_READ_ONLY, "Written by a provider");
		}
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

}
