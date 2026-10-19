package tn.autocare.notification.event;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.maintenance.api.MaintenanceReminderDue;
import tn.autocare.notification.service.NotificationDraft;
import tn.autocare.notification.service.NotificationService;
import tn.autocare.organization.api.OrganizationApproved;
import tn.autocare.organization.api.OrganizationFacade;
import tn.autocare.organization.api.OrganizationSummary;
import tn.autocare.servicerequest.api.MessageSide;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.api.ServiceRequestCreated;
import tn.autocare.servicerequest.api.ServiceRequestDto;
import tn.autocare.servicerequest.api.ServiceRequestMessagePosted;
import tn.autocare.servicerequest.api.ServiceRequestFacade;
import tn.autocare.servicerequest.api.ServiceRequestPermissions;
import tn.autocare.servicerequest.api.ServiceRequestQuoted;
import tn.autocare.servicerequest.api.ServiceRequestStatusChanged;

/**
 * Turns other modules' events into in-app notifications (after their commit, retried).
 */
@Component
@RequiredArgsConstructor
class NotificationEventsListener {

	static final String ORGANIZATION = "ORGANIZATION";

	static final String SERVICE_REQUEST = "SERVICE_REQUEST";

	static final String VEHICLE = "VEHICLE";

	private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	private final NotificationService notificationService;

	private final OrganizationFacade organizationFacade;

	private final ServiceRequestFacade serviceRequestFacade;

	private final CatalogFacade catalogFacade;

	private final AuthFacade authFacade;

	@ApplicationModuleListener
	void on(OrganizationApproved event) {
		OrganizationSummary org = organizationFacade.getOrganization(event.organizationId());
		notificationService.sendNotification(NotificationDraft.translated("ORGANIZATION_APPROVED", List.of(org.name()),
				org.id(), ORGANIZATION, org.id(), Set.of(event.ownerId())));
	}

	@ApplicationModuleListener
	void on(ServiceRequestCreated event) {
		ServiceRequestDto request = serviceRequestFacade.findServiceRequest(event.serviceRequestId()).orElseThrow();
		notificationService.sendNotification(NotificationDraft.translated("SERVICE_REQUEST_CREATED",
				List.of(customerName(event.userId()), serviceName(event.serviceId()),
						request.desiredDate().format(DATE)),
				event.organizationId(), SERVICE_REQUEST, event.serviceRequestId(), membersWhoSeeRequests(event)));
	}

	@ApplicationModuleListener
	void on(ServiceRequestStatusChanged event) {
		ServiceRequestDto request = serviceRequestFacade.findServiceRequest(event.serviceRequestId()).orElseThrow();
		String service = serviceName(request.serviceId());
		String type = "SERVICE_REQUEST_" + event.toStatus().name();
		// The client confirmed by accepting the quote: the garage is the one to tell.
		boolean byClient = event.changedBy().equals(event.userId());
		if (byClient && event.toStatus() == RequestStatus.CONFIRMED) {
			notificationService.sendNotification(NotificationDraft.translated("SERVICE_REQUEST_QUOTE_ACCEPTED",
					List.of(customerName(event.userId()), service), event.organizationId(), SERVICE_REQUEST,
					event.serviceRequestId(), membersWithPermission(event.organizationId())));
			return;
		}
		if (event.toStatus() == RequestStatus.CANCELLED) {
			Set<Long> members = new HashSet<>(organizationFacade.listMemberUserIdsWithPermission(event.organizationId(),
					ServiceRequestPermissions.REQUEST_READ));
			notificationService
				.sendNotification(NotificationDraft.translated(type, List.of(customerName(event.userId()), service),
						event.organizationId(), SERVICE_REQUEST, event.serviceRequestId(), members));
			return;
		}
		String organization = organizationFacade.findOrganization(event.organizationId())
			.map(OrganizationSummary::name)
			.orElse("");
		notificationService.sendNotification(NotificationDraft.translated(type, List.of(organization, service),
				event.organizationId(), SERVICE_REQUEST, event.serviceRequestId(), Set.of(event.userId())));
	}

	@ApplicationModuleListener
	void on(ServiceRequestQuoted event) {
		ServiceRequestDto request = serviceRequestFacade.findServiceRequest(event.serviceRequestId()).orElseThrow();
		String organization = organizationFacade.findOrganization(event.organizationId())
			.map(OrganizationSummary::name)
			.orElse("");
		notificationService.sendNotification(NotificationDraft.translated("SERVICE_REQUEST_QUOTED",
				List.of(organization, serviceName(request.serviceId()),
						event.amount().toPlainString() + " " + event.currency()),
				event.organizationId(), SERVICE_REQUEST, event.serviceRequestId(), Set.of(event.userId())));
	}

	@ApplicationModuleListener
	void on(ServiceRequestMessagePosted event) {
		if (event.side() == MessageSide.CLIENT) {
			notificationService.sendNotification(NotificationDraft.translated("SERVICE_REQUEST_CLIENT_MESSAGE",
					List.of(customerName(event.userId()), event.preview()), event.organizationId(), SERVICE_REQUEST,
					event.serviceRequestId(), membersWithPermission(event.organizationId())));
			return;
		}
		String organization = organizationFacade.findOrganization(event.organizationId())
			.map(OrganizationSummary::name)
			.orElse("");
		notificationService.sendNotification(
				NotificationDraft.translated("SERVICE_REQUEST_PROVIDER_MESSAGE", List.of(organization, event.preview()),
						event.organizationId(), SERVICE_REQUEST, event.serviceRequestId(), Set.of(event.userId())));
	}

	@ApplicationModuleListener
	void on(MaintenanceReminderDue event) {
		List<String> due = new ArrayList<>();
		if (event.dueDate() != null) {
			due.add(event.dueDate().format(DATE));
		}
		if (event.dueMileage() != null) {
			due.add(event.dueMileage() + " km");
		}
		notificationService.sendNotification(NotificationDraft.translated("MAINTENANCE_REMINDER_DUE",
				List.of(event.title(), String.join(" · ", due)), null, VEHICLE, event.vehicleId(),
				Set.of(event.ownerId())));
	}

	private Set<Long> membersWithPermission(Long organizationId) {
		return new HashSet<>(organizationFacade.listMemberUserIdsWithPermission(organizationId,
				ServiceRequestPermissions.REQUEST_READ));
	}

	private Set<Long> membersWhoSeeRequests(ServiceRequestCreated event) {
		return new HashSet<>(organizationFacade.listMemberUserIdsWithPermission(event.organizationId(),
				ServiceRequestPermissions.REQUEST_READ));
	}

	private String customerName(Long userId) {
		return authFacade.findUser(userId).map(UserSummary::fullName).orElse("");
	}

	private String serviceName(Long serviceId) {
		return catalogFacade.findAutoService(serviceId).map(AutoServiceDto::name).orElse("");
	}

}
