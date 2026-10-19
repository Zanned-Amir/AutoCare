package tn.autocare.organization.api;

/** {@code approvedBy}: the admin who approved it. */
public record OrganizationApproved(Long organizationId, Long ownerId, Long approvedBy) {
}
