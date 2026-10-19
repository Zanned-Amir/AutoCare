package tn.autocare.notification.entity;

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
@Table(schema = "notification", name = "notifications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

	/** Empty for system messages. */
	@Column(name = "sender_id")
	private Long senderId;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(nullable = false, length = 60)
	private String type;

	/** Values for {0}, {1}... in the translated text. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private List<String> params = new ArrayList<>();

	@Column(length = 200)
	private String title;

	@Column(length = 1000)
	private String body;

	@Column(name = "resource_type", length = 40)
	private String resourceType;

	@Column(name = "resource_id")
	private Long resourceId;

	public static Notification create(Long senderId, Long organizationId, String type, List<String> params,
			String title, String body, String resourceType, Long resourceId) {
		Notification notification = new Notification();
		notification.senderId = senderId;
		notification.organizationId = organizationId;
		notification.type = type;
		notification.params = new ArrayList<>(params);
		notification.title = title;
		notification.body = body;
		notification.resourceType = resourceType;
		notification.resourceId = resourceId;
		return notification;
	}

}
