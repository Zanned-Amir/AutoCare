package tn.autocare.servicerequest.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import tn.autocare.servicerequest.api.LocationType;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.shared.exception.AppException;

class ServiceRequestWorkflowTests {

	@Test
	void happyPathGoesFromPendingToCompleted() {
		ServiceRequest request = newRequest();
		assertThat(request.confirm()).isEqualTo(RequestStatus.PENDING);
		assertThat(request.start()).isEqualTo(RequestStatus.CONFIRMED);
		assertThat(request.complete(Instant.now())).isEqualTo(RequestStatus.IN_PROGRESS);
		assertThat(request.getStatus()).isEqualTo(RequestStatus.COMPLETED);
		assertThat(ServiceRequestWorkflow.isOpen(RequestStatus.COMPLETED)).isFalse();
	}

	@Test
	void refusesSkippingOrReopening() {
		ServiceRequest request = newRequest();
		assertThatThrownBy(request::start).isInstanceOf(AppException.class);
		request.reject("Complet");
		assertThat(request.getRejectionReason()).isEqualTo("Complet");
		assertThatThrownBy(request::confirm).isInstanceOf(AppException.class);
		assertThatThrownBy(() -> request.cancel(null)).isInstanceOf(AppException.class);
	}

	@Test
	void clientCanCancelUntilTheWorkStarts() {
		assertThat(ServiceRequestWorkflow.canMove(RequestStatus.PENDING, RequestStatus.CANCELLED)).isTrue();
		assertThat(ServiceRequestWorkflow.canMove(RequestStatus.CONFIRMED, RequestStatus.CANCELLED)).isTrue();
		assertThat(ServiceRequestWorkflow.canMove(RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED)).isFalse();
	}

	private static ServiceRequest newRequest() {
		return ServiceRequest.submit(1L, 2L, 3L, 4L, null, LocalDate.now(), null, LocationType.AT_PROVIDER, null, null);
	}

}
