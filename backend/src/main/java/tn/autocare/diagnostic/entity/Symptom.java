package tn.autocare.diagnostic.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "diagnostic", name = "symptoms")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Symptom extends BaseEntity {

	@Column(nullable = false, length = 120)
	private String label;

	@Column(length = 500)
	private String description;

	@Column(nullable = false)
	private int position;

	@Column(nullable = false)
	private boolean active;

	public static Symptom create(String label, String description, int position, boolean active) {
		Symptom symptom = new Symptom();
		symptom.updateDetails(label, description, position, active);
		return symptom;
	}

	public void updateDetails(String label, String description, int position, boolean active) {
		this.label = label.trim();
		this.description = description == null || description.isBlank() ? null : description.trim();
		this.position = position;
		this.active = active;
	}

}
