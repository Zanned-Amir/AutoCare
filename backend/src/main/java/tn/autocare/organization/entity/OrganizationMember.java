package tn.autocare.organization.entity;

import java.time.Instant;
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
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.shared.persistence.BaseEntity;
import tn.autocare.shared.security.PermissionMatcher;

@Getter
@Entity
@Table(schema = "organization", name = "organization_members")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationMember extends BaseEntity {

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	/** User id from the auth module. */
	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private MemberStatus status;

	@Enumerated(EnumType.STRING)
	@Column(name = "role_key", nullable = false, length = 40)
	private MemberRoleKey roleKey;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private List<String> permissions = new ArrayList<>();

	@Column(name = "joined_at", nullable = false)
	private Instant joinedAt;

	public static OrganizationMember join(Long organizationId, Long userId, MemberRoleKey roleKey) {
		OrganizationMember member = new OrganizationMember();
		member.organizationId = organizationId;
		member.userId = userId;
		member.status = MemberStatus.ACTIVE;
		member.joinedAt = Instant.now();
		member.changeRole(roleKey);
		return member;
	}

	public void changeRole(MemberRoleKey roleKey) {
		this.roleKey = roleKey;
		this.permissions = new ArrayList<>(roleKey.permissions());
	}

	public void changePermissions(List<String> permissions) {
		this.roleKey = MemberRoleKey.CUSTOM;
		this.permissions = new ArrayList<>(permissions.stream().distinct().sorted().toList());
	}

	public void changeStatus(MemberStatus status) {
		this.status = status;
	}

	public boolean isActive() {
		return status == MemberStatus.ACTIVE;
	}

	/** Every organization needs at least one active member who can manage members. */
	public boolean canManageMembers() {
		return isActive() && PermissionMatcher.grants(permissions, OrganizationPermissions.MEMBER_MANAGE);
	}

}
