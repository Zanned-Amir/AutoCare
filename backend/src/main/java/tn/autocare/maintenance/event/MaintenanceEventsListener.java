package tn.autocare.maintenance.event;

import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.maintenance.service.MaintenanceReminderService;
import tn.autocare.maintenance.service.MaintenanceService;
import tn.autocare.servicerequest.api.ServiceRequestCompleted;
import tn.autocare.vehicle.api.VehicleDeleted;

@Component
@RequiredArgsConstructor
class MaintenanceEventsListener {

	private final MaintenanceService maintenanceService;

	private final MaintenanceReminderService reminderService;

	@ApplicationModuleListener
	void on(ServiceRequestCompleted event) {
		maintenanceService.recordCompletedServiceRequest(event);
	}

	@ApplicationModuleListener
	void on(VehicleDeleted event) {
		maintenanceService.deleteVehicleHistory(event.vehicleId());
		reminderService.deleteVehicleReminders(event.vehicleId());
	}

}
