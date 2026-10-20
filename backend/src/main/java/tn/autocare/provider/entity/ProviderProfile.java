package tn.autocare.provider.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

/**
 * Local copy of an organization's public profile, used only for search and the public
 * profile page. Written from OrganizationProfileChanged events, never edited directly.
 */
@Getter
@Entity
@Table(schema = "provider", name = "provider_profiles")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProviderProfile extends BaseEntity {

	@Column(name = "organization_id", nullable = false, unique = true)
	private Long organizationId;

	@Column(nullable = false, length = 120)
	private String name;

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

	/** Approved provider organizations only. */
	@Column(nullable = false)
	private boolean visible;

	/** Lower-case, accent-free text indexed by the search_vector column. */
	@Column(name = "search_text", nullable = false, columnDefinition = "text")
	private String searchText;

	@Column
	private Double latitude;

	@Column
	private Double longitude;

	/** True when the point is the governorate's centre rather than the real address. */
	@Column(name = "approximate_location", nullable = false)
	private boolean approximateLocation = true;

	/** When the organization change copied here happened. */
	@Column(name = "source_changed_at")
	private Instant sourceChangedAt;

	/**
	 * False for an event older than the one already applied (events may run
	 * concurrently).
	 */
	public boolean acceptsChangeAt(Instant changedAt) {
		if (sourceChangedAt != null && changedAt.isBefore(sourceChangedAt)) {
			return false;
		}
		sourceChangedAt = changedAt;
		return true;
	}

	public void sync(String name, String description, String phone, String governorate, String city, String address,
			String serviceZone, boolean visible) {
		this.name = name;
		this.description = description;
		this.phone = phone;
		this.governorate = governorate;
		this.city = city;
		this.address = address;
		this.serviceZone = serviceZone;
		this.visible = visible;
	}

	public void locate(Double latitude, Double longitude, boolean approximate) {
		this.latitude = latitude;
		this.longitude = longitude;
		this.approximateLocation = approximate;
	}

	public void updateSearchText(String searchText) {
		this.searchText = searchText;
	}

}
