package tn.autocare.maintenance.api;

import java.util.List;

public interface MaintenanceFacade {

	/** Newest first. */
	List<MaintenanceRecordDto> listVehicleHistory(Long vehicleId);

}
