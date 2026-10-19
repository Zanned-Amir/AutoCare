package tn.autocare.audit.service;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.audit.api.AuditTargetType;
import tn.autocare.audit.dto.AuditLogResponse;
import tn.autocare.audit.entity.AuditLog;
import tn.autocare.audit.repository.AuditLogRepository;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditLogService {

	private final AuditLogRepository auditLogRepository;

	private final AuthFacade authFacade;

	@Transactional
	public void recordAuditLog(Long actorId, String action, AuditTargetType targetType, Long targetId,
			Map<String, Object> details) {
		auditLogRepository.save(AuditLog.record(actorId, action, targetType, targetId, details));
	}

	/** Newest first; {@code targetId} only counts with a {@code targetType}. */
	public Page<AuditLogResponse> searchAuditLogs(@Nullable AuditTargetType targetType, @Nullable Long targetId,
			Pageable pageable) {
		Page<AuditLog> page = targetType == null ? auditLogRepository.findAll(pageable)
				: targetId == null ? auditLogRepository.findAllByTargetType(targetType, pageable)
						: auditLogRepository.findAllByTargetTypeAndTargetId(targetType, targetId, pageable);
		Map<Long, String> actors = authFacade
			.listUsers(page.getContent().stream().map(AuditLog::getActorId).distinct().toList())
			.stream()
			.collect(Collectors.toMap(UserSummary::id, UserSummary::fullName));
		return new PageImpl<>(page.getContent()
			.stream()
			.map(log -> new AuditLogResponse(log.getId(), log.getActorId(), actors.get(log.getActorId()),
					log.getAction(), log.getTargetType(), log.getTargetId(), log.getDetails(), log.getCreatedAt()))
			.toList(), page.getPageable(), page.getTotalElements());
	}

}
