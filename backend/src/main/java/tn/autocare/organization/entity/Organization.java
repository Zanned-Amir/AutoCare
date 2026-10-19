package tn.autocare.organization.entity;

import java.util.LinkedHashMap;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.organization.api.OrganizationType;
import tn.autocare.organization.api.Governorates;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "organization", name = "organizations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Organization extends BaseEntity {

	@Column(nullable = false, length = 120)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OrganizationType type;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OrganizationStatus status;

	/** User id from the auth module. */
	@Column(name = "owner_id", nullable = false)
	private Long ownerId;

	@Column(length = 1000)
	private String description;

	@Column(nullable = false, length = 30)
	private String phone;

	@Column(nullable = false, length = 40)
	private String governorate;

	@Column(nullable = false, length = 80)
	private String city;

	@Column(length = 255)
	private String address;

	@Column(name = "service_zone", length = 255)
	private String serviceZone;

	/**
	 * Day key to opening hours, e.g. {"mon": "08:00-12:00,14:00-18:00"}; missing =
	 * closed.
	 */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "working_hours", nullable = false, columnDefinition = "jsonb")
	private Map<String, String> workingHours = new LinkedHashMap<>();

	/**
	 * Where the business is, picked on the map. Empty: the governorate's centre is used.
	 */
	/** Length of one booking slot. */
	@Column(name = "slot_minutes", nullable = false)
	private int slotMinutes = 60;

	/** How many clients one slot takes (bays, technicians). */
	@Column(name = "slot_capacity", nullable = false)
	private int slotCapacity = 1;

	@Column
	private Double latitude;

	@Column
	private Double longitude;

	private static final java.util.List<String> DAYS = java.util.List.of("mon", "tue", "wed", "thu", "fri", "sat",
			"sun");

	private static final String RANGE = "([01]\\d|2[0-3]):[0-5]\\d-([01]\\d|2[0-3]):[0-5]\\d";

	private static final String RANGES = RANGE + "( ?, ?" + RANGE + ")*";

	public static Organization create(Long ownerId, OrganizationType type, OrganizationDetails details) {
		Organization organization = new Organization();
		organization.ownerId = ownerId;
		organization.type = type;
		organization.status = OrganizationStatus.PENDING;
		organization.updateDetails(details);
		return organization;
	}

	public void updateDetails(OrganizationDetails details) {
		this.name = details.name().trim();
		this.description = details.description();
		this.phone = details.phone().trim();
		this.governorate = details.governorate();
		this.city = details.city().trim();
		this.address = details.address();
		this.serviceZone = details.serviceZone();
		// The profile form does not send hours: keep the ones set from the schedule
		// screen.
		if (details.workingHours() != null) {
			this.workingHours = new LinkedHashMap<>(details.workingHours());
		}
		if ((details.latitude() == null) != (details.longitude() == null)
				|| (details.latitude() != null && !Governorates.isInTunisia(details.latitude(), details.longitude()))) {
			throw new AppException(ErrorCode.ORGANIZATION_LOCATION_INVALID, "Location must be in Tunisia");
		}
		this.latitude = details.latitude();
		this.longitude = details.longitude();
	}

	public void updateSchedule(Map<String, String> hours, int slotMinutes, int slotCapacity) {
		Map<String, String> cleaned = new LinkedHashMap<>();
		hours.forEach((day, ranges) -> {
			if (!DAYS.contains(day) || (ranges != null && !ranges.isBlank() && !ranges.trim().matches(RANGES))) {
				throw new AppException(ErrorCode.ORGANIZATION_SCHEDULE_INVALID, "Invalid hours for " + day);
			}
			if (ranges != null && !ranges.isBlank()) {
				cleaned.put(day, ranges.replace(" ", ""));
			}
		});
		this.workingHours = cleaned;
		this.slotMinutes = slotMinutes;
		this.slotCapacity = slotCapacity;
	}

	public void approve() {
		if (status == OrganizationStatus.APPROVED) {
			throw new AppException(ErrorCode.ORGANIZATION_STATUS_INVALID, "Organization is already approved");
		}
		status = OrganizationStatus.APPROVED;
	}

	public void suspend() {
		if (status == OrganizationStatus.SUSPENDED) {
			throw new AppException(ErrorCode.ORGANIZATION_STATUS_INVALID, "Organization is already suspended");
		}
		status = OrganizationStatus.SUSPENDED;
	}

}
