package tn.autocare.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "catalog", name = "auto_services")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AutoService extends BaseEntity {

	@Column(nullable = false, length = 120)
	private String name;

	@Column(length = 1000)
	private String description;

	@Column(nullable = false)
	private boolean active;

	/**
	 * Key of the icon the apps show for this service ("droplet"); empty = the default
	 * one.
	 */
	@Column(length = 40)
	private String icon;

	public static AutoService create(String name, String description, String icon) {
		AutoService service = new AutoService();
		service.name = name.trim();
		service.description = description;
		service.icon = blankToNull(icon);
		service.active = true;
		return service;
	}

	public void deactivate() {
		this.active = false;
	}

	public void reactivate() {
		this.active = true;
	}

	public void update(String name, String description, boolean active, String icon) {
		this.name = name.trim();
		this.description = description;
		this.active = active;
		this.icon = blankToNull(icon);
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

}
