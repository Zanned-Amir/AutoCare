package tn.autocare.diagnostic.entity;

import java.util.HashMap;
import java.util.List;
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
import tn.autocare.shared.persistence.BaseEntity;

/** One diagnostic run. The result is a copy of the rule at that time. */
@Getter
@Entity
@Table(schema = "diagnostic", name = "diagnostics")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Diagnostic extends BaseEntity {

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "vehicle_id")
	private Long vehicleId;

	@Column(name = "symptom_id", nullable = false)
	private Long symptomId;

	@Column(name = "rule_id")
	private Long ruleId;

	/** Question id (as text) to the normalized answer values. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private Map<String, List<String>> answers = new HashMap<>();

	@Column(name = "possible_cause", length = 300)
	private String possibleCause;

	@Column(length = 1000)
	private String recommendation;

	@Column(name = "service_id")
	private Long serviceId;

	@Enumerated(EnumType.STRING)
	@Column(length = 10)
	private DiagnosticUrgency urgency;

	public static Diagnostic record(Long userId, Long vehicleId, Long symptomId, Map<String, List<String>> answers,
			Long ruleId, String possibleCause, String recommendation, Long serviceId, DiagnosticUrgency urgency) {
		Diagnostic diagnostic = new Diagnostic();
		diagnostic.userId = userId;
		diagnostic.vehicleId = vehicleId;
		diagnostic.symptomId = symptomId;
		diagnostic.answers = new HashMap<>(answers);
		diagnostic.ruleId = ruleId;
		diagnostic.possibleCause = possibleCause;
		diagnostic.recommendation = recommendation;
		diagnostic.serviceId = serviceId;
		diagnostic.urgency = urgency;
		return diagnostic;
	}

	public boolean isMatched() {
		return possibleCause != null;
	}

}
