package tn.autocare.diagnostic.entity;

import java.util.ArrayList;
import java.util.List;

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

@Getter
@Entity
@Table(schema = "diagnostic", name = "rules")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DiagnosticRule extends BaseEntity {

	@Column(name = "symptom_id", nullable = false)
	private Long symptomId;

	@Column(nullable = false, length = 120)
	private String name;

	/** Every condition must match. No condition = fallback rule that always matches. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private List<RuleCondition> conditions = new ArrayList<>();

	@Column(nullable = false)
	private int priority;

	@Column(name = "possible_cause", nullable = false, length = 300)
	private String possibleCause;

	@Column(nullable = false, length = 1000)
	private String recommendation;

	/** Catalog service suggested to fix it; empty when no service fits. */
	@Column(name = "service_id")
	private Long serviceId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private DiagnosticUrgency urgency;

	public static DiagnosticRule create(Long symptomId, String name, List<RuleCondition> conditions, int priority,
			String possibleCause, String recommendation, Long serviceId, DiagnosticUrgency urgency) {
		DiagnosticRule rule = new DiagnosticRule();
		rule.symptomId = symptomId;
		rule.updateDetails(name, conditions, priority, possibleCause, recommendation, serviceId, urgency);
		return rule;
	}

	public void updateDetails(String name, List<RuleCondition> conditions, int priority, String possibleCause,
			String recommendation, Long serviceId, DiagnosticUrgency urgency) {
		this.name = name.trim();
		this.conditions = new ArrayList<>(conditions);
		this.priority = priority;
		this.possibleCause = possibleCause.trim();
		this.recommendation = recommendation.trim();
		this.serviceId = serviceId;
		this.urgency = urgency;
	}

	public boolean usesQuestion(Long questionId) {
		return conditions.stream().anyMatch(condition -> condition.questionId().equals(questionId));
	}

}
