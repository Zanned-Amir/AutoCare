package tn.autocare.audit.event;

import java.util.HashMap;
import java.util.Map;

import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.audit.api.AuditTargetType;
import tn.autocare.audit.service.AuditLogService;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.RoleChanged;
import tn.autocare.auth.api.UserInvited;
import tn.autocare.auth.api.UserRolesChanged;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.auth.api.UserSuspended;
import tn.autocare.auth.api.UserUnsuspended;
import tn.autocare.catalog.api.AutoServiceActivationChanged;
import tn.autocare.organization.api.OrganizationApproved;
import tn.autocare.organization.api.OrganizationMemberChanged;
import tn.autocare.organization.api.OrganizationSuspended;

/**
 * Writes one audit record per sensitive action, after the action's commit (retried by the
 * event registry). Action names are {@code <TARGET>_<WHAT>}, read by the backoffice.
 */
@Component
@RequiredArgsConstructor
class AuditEventsListener {

	private final AuditLogService auditLogService;

	private final AuthFacade authFacade;

	@ApplicationModuleListener
	void on(UserInvited event) {
		auditLogService.recordAuditLog(event.invitedBy(), "USER_INVITED", AuditTargetType.USER, event.userId(),
				Map.of());
	}

	@ApplicationModuleListener
	void on(UserSuspended event) {
		auditLogService.recordAuditLog(event.suspendedBy(), "USER_SUSPENDED", AuditTargetType.USER, event.userId(),
				Map.of());
	}

	@ApplicationModuleListener
	void on(UserUnsuspended event) {
		auditLogService.recordAuditLog(event.unsuspendedBy(), "USER_UNSUSPENDED", AuditTargetType.USER, event.userId(),
				Map.of());
	}

	@ApplicationModuleListener
	void on(UserRolesChanged event) {
		auditLogService.recordAuditLog(event.changedBy(), "USER_ROLES_CHANGED", AuditTargetType.USER, event.userId(),
				Map.of("roles", event.roles()));
	}

	@ApplicationModuleListener
	void on(RoleChanged event) {
		auditLogService.recordAuditLog(event.changedBy(), "ROLE_" + event.action(), AuditTargetType.ROLE,
				event.roleId(), Map.of("name", event.name(), "permissions", event.permissions()));
	}

	@ApplicationModuleListener
	void on(OrganizationApproved event) {
		auditLogService.recordAuditLog(event.approvedBy(), "ORGANIZATION_APPROVED", AuditTargetType.ORGANIZATION,
				event.organizationId(), Map.of());
	}

	@ApplicationModuleListener
	void on(OrganizationSuspended event) {
		auditLogService.recordAuditLog(event.suspendedBy(), "ORGANIZATION_SUSPENDED", AuditTargetType.ORGANIZATION,
				event.organizationId(), Map.of());
	}

	/** The member's name is copied so the record still reads well once they leave. */
	@ApplicationModuleListener
	void on(OrganizationMemberChanged event) {
		Map<String, Object> details = new HashMap<>();
		details.put("memberUserId", event.memberUserId());
		authFacade.findUser(event.memberUserId())
			.map(UserSummary::fullName)
			.ifPresent(name -> details.put("memberName", name));
		if (event.value() != null) {
			details.put("value", event.value());
		}
		auditLogService.recordAuditLog(event.changedBy(), "ORGANIZATION_MEMBER_" + event.change().name(),
				AuditTargetType.ORGANIZATION, event.organizationId(), details);
	}

	@ApplicationModuleListener
	void on(AutoServiceActivationChanged event) {
		auditLogService.recordAuditLog(event.changedBy(),
				event.active() ? "AUTO_SERVICE_REACTIVATED" : "AUTO_SERVICE_DEACTIVATED", AuditTargetType.AUTO_SERVICE,
				event.autoServiceId(), Map.of());
	}

}
