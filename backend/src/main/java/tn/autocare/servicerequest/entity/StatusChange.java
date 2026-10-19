package tn.autocare.servicerequest.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.shared.persistence.BaseEntity;

/** One row of ServiceRequestStatusHistory: who moved the request, from where to where. */
@Getter
@Entity
@Table(schema = "servicerequest", name = "status_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StatusChange extends BaseEntity {

	@Column(name = "service_request_id", nullable = false)
	private Long serviceRequestId;

	@Enumerated(EnumType.STRING)
	@Column(name = "from_status", length = 20)
	private RequestStatus fromStatus;

	@Enumerated(EnumType.STRING)
	@Column(name = "to_status", nullable = false, length = 20)
	private RequestStatus toStatus;

	@Column(name = "changed_by", nullable = false)
	private Long changedBy;

	@Column(length = 500)
	private String note;

	public static StatusChange record(Long serviceRequestId, RequestStatus fromStatus, RequestStatus toStatus,
			Long changedBy, String note) {
		StatusChange change = new StatusChange();
		change.serviceRequestId = serviceRequestId;
		change.fromStatus = fromStatus;
		change.toStatus = toStatus;
		change.changedBy = changedBy;
		change.note = note == null || note.isBlank() ? null : note.trim();
		return change;
	}

}
