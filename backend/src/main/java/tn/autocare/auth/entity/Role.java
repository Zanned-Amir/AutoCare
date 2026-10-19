package tn.autocare.auth.entity;

import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "auth", name = "roles")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Role extends BaseEntity {

	@Column(nullable = false, length = 50)
	private String name;

	@Column(length = 255)
	private String description;

	/** {@code resource:action} strings, wildcards allowed. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private List<String> permissions = new ArrayList<>();

	/** Staff role: lets its users open backoffice sessions. */
	@Column(nullable = false)
	private boolean backoffice;

	/** Name shown in the backoffice ("Agent support"). */
	@Column(nullable = false, length = 80)
	private String label;

	/** Seeded by Flyway: cannot be deleted or renamed. */
	@Column(nullable = false)
	private boolean system;

	public static Role create(String name, String label, String description, List<String> permissions,
			boolean backoffice) {
		Role role = new Role();
		role.name = name;
		role.update(label, description, permissions, backoffice);
		return role;
	}

	public void update(String label, String description, List<String> permissions, boolean backoffice) {
		this.label = label.trim();
		this.description = description == null || description.isBlank() ? null : description.trim();
		this.permissions = new ArrayList<>(permissions.stream().map(String::trim).distinct().sorted().toList());
		this.backoffice = backoffice;
	}

}
