package tn.autocare.audit.entity;

import java.util.HashMap;
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
import tn.autocare.audit.api.AuditTargetType;
import tn.autocare.shared.persistence.BaseEntity;

/** Never edited nor deleted once written. */
@Getter
@Entity
@Table(schema = "audit", name = "audit_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditLog extends BaseEntity {

	@Column(name = "actor_id", nullable = false)
	private Long actorId;

	@Column(nullable = false, length = 60)
	private String action;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, length = 30)
	private AuditTargetType targetType;

	@Column(name = "target_id", nullable = false)
	private Long targetId;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private Map<String, Object> details = new HashMap<>();

	public static AuditLog record(Long actorId, String action, AuditTargetType targetType, Long targetId,
			Map<String, Object> details) {
		AuditLog log = new AuditLog();
		log.actorId = actorId;
		log.action = action;
		log.targetType = targetType;
		log.targetId = targetId;
		log.details = new HashMap<>(details);
		return log;
	}

}
