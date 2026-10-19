package tn.autocare.audit.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.audit.api.AuditPermissions;
import tn.autocare.audit.api.AuditTargetType;
import tn.autocare.audit.dto.AuditLogResponse;
import tn.autocare.audit.service.AuditLogService;

@Tag(name = "Admin - Audit")
@RestController
@RequestMapping("/admin/audit-logs")
@RequiredArgsConstructor
public class AdminAuditController {

	private final AuditLogService auditLogService;

	@GetMapping
	@PreAuthorize("@perm.has('" + AuditPermissions.AUDIT_READ + "')")
	public PagedModel<AuditLogResponse> searchAuditLogs(@RequestParam(required = false) AuditTargetType targetType,
			@RequestParam(required = false) Long targetId,
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(auditLogService.searchAuditLogs(targetType, targetId, pageable));
	}

}
