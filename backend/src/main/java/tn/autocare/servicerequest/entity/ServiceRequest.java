package tn.autocare.servicerequest.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.servicerequest.api.LocationType;
import tn.autocare.servicerequest.api.QuoteStatus;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "servicerequest", name = "service_requests")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceRequest extends BaseEntity {

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "vehicle_id", nullable = false)
	private Long vehicleId;

	@Column(name = "service_id", nullable = false)
	private Long serviceId;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	/** The diagnostic that led to this request, if any. */
	@Column(name = "diagnostic_id")
	private Long diagnosticId;

	@Column(name = "desired_date", nullable = false)
	private LocalDate desiredDate;

	/** The booked slot; empty when the client gave only a day. */
	@Column(name = "desired_time")
	private LocalTime desiredTime;

	@Enumerated(EnumType.STRING)
	@Column(name = "location_type", nullable = false, length = 20)
	private LocationType locationType;

	/** Address for a home service. */
	@Column(length = 300)
	private String location;

	@Column(length = 1000)
	private String note;

	@Column(name = "rejection_reason", length = 500)
	private String rejectionReason;

	@Column(name = "cancellation_reason", length = 500)
	private String cancellationReason;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private RequestStatus status;

	@Column(name = "completed_at")
	private Instant completedAt;

	@Column(name = "quote_amount", precision = 12, scale = 3)
	private BigDecimal quoteAmount;

	@Column(name = "quote_currency", length = 3)
	private String quoteCurrency;

	@Column(name = "quote_note", length = 1000)
	private String quoteNote;

	@Enumerated(EnumType.STRING)
	@Column(name = "quote_status", length = 20)
	private QuoteStatus quoteStatus;

	@Column(name = "quoted_at")
	private Instant quotedAt;

	@Version
	private long version;

	public static ServiceRequest submit(Long userId, Long vehicleId, Long serviceId, Long organizationId,
			Long diagnosticId, LocalDate desiredDate, LocalTime desiredTime, LocationType locationType, String location,
			String note) {
		ServiceRequest request = new ServiceRequest();
		request.userId = userId;
		request.vehicleId = vehicleId;
		request.serviceId = serviceId;
		request.organizationId = organizationId;
		request.diagnosticId = diagnosticId;
		request.desiredDate = desiredDate;
		request.desiredTime = desiredTime;
		request.locationType = locationType;
		request.location = blankToNull(location);
		request.note = blankToNull(note);
		request.status = RequestStatus.PENDING;
		return request;
	}

	public RequestStatus confirm() {
		return moveTo(RequestStatus.CONFIRMED);
	}

	public RequestStatus reject(String reason) {
		RequestStatus from = moveTo(RequestStatus.REJECTED);
		this.rejectionReason = reason.trim();
		return from;
	}

	public RequestStatus start() {
		return moveTo(RequestStatus.IN_PROGRESS);
	}

	public RequestStatus complete(Instant now) {
		RequestStatus from = moveTo(RequestStatus.COMPLETED);
		this.completedAt = now;
		return from;
	}

	public RequestStatus cancel(String reason) {
		RequestStatus from = moveTo(RequestStatus.CANCELLED);
		this.cancellationReason = blankToNull(reason);
		return from;
	}

	/**
	 * Only while the request waits for an answer; a new quote replaces the previous one.
	 */
	public void sendQuote(BigDecimal amount, String note, Instant now) {
		if (status != RequestStatus.PENDING) {
			throw new AppException(ErrorCode.QUOTE_NOT_ALLOWED, "A quote is only sent on a pending request");
		}
		this.quoteAmount = amount;
		this.quoteCurrency = "TND";
		this.quoteNote = blankToNull(note);
		this.quoteStatus = QuoteStatus.SENT;
		this.quotedAt = now;
	}

	/** The client agrees to the price: the request is confirmed. */
	public RequestStatus acceptQuote() {
		checkQuoteAwaitingAnswer();
		this.quoteStatus = QuoteStatus.ACCEPTED;
		return confirm();
	}

	/** The request stays pending: the provider may send another quote or reject it. */
	public void declineQuote() {
		checkQuoteAwaitingAnswer();
		this.quoteStatus = QuoteStatus.DECLINED;
	}

	private void checkQuoteAwaitingAnswer() {
		if (quoteStatus != QuoteStatus.SENT || status != RequestStatus.PENDING) {
			throw new AppException(ErrorCode.QUOTE_NOT_PENDING, "No quote is waiting for an answer");
		}
	}

	public boolean isCreatedBy(Long userId) {
		return this.userId.equals(userId);
	}

	private RequestStatus moveTo(RequestStatus to) {
		if (!ServiceRequestWorkflow.canMove(status, to)) {
			throw new AppException(ErrorCode.SERVICE_REQUEST_STATUS_INVALID, "Cannot go from " + status + " to " + to);
		}
		RequestStatus from = status;
		status = to;
		return from;
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

}
