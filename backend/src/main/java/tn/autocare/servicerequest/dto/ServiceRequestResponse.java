package tn.autocare.servicerequest.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import tn.autocare.servicerequest.api.LocationType;
import tn.autocare.servicerequest.api.QuoteStatus;
import tn.autocare.servicerequest.api.RequestStatus;

/**
 * {@code customer} is only filled for the provider; the client already knows who they
 * are. {@code quote} is empty until the provider sends one.
 */
public record ServiceRequestResponse(Long id, RequestStatus status, LocalDate desiredDate, LocalTime desiredTime,
		LocationType locationType, String location, String note, String rejectionReason, String cancellationReason,
		ServiceInfo service, OrganizationInfo organization, VehicleInfo vehicle, CustomerInfo customer,
		DiagnosticInfo diagnostic, QuoteInfo quote, Instant createdAt, Instant updatedAt, Instant completedAt) {

	public record ServiceInfo(Long id, String name) {
	}

	public record OrganizationInfo(Long id, String name, String governorate, String city) {
	}

	public record VehicleInfo(Long id, String brand, String model, int year, int mileage, String plate) {
	}

	public record CustomerInfo(Long id, String fullName, String phone, String email) {
	}

	public record DiagnosticInfo(Long id, String possibleCause) {
	}

	/** {@code amount} is a decimal string (TND, 3 decimals). */
	public record QuoteInfo(@JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount, String currency,
			String note, QuoteStatus status, Instant sentAt) {
	}

}
