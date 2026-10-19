package tn.autocare.maintenance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.maintenance.entity.MaintenanceReminder;

public interface MaintenanceReminderRepository extends JpaRepository<MaintenanceReminder, Long> {

	/** Open ones first (PostgreSQL sorts NULL first in DESC), soonest due first. */
	List<MaintenanceReminder> findAllByVehicleIdOrderByDoneAtDescDueDateAscIdAsc(Long vehicleId);

	Optional<MaintenanceReminder> findByIdAndVehicleId(Long id, Long vehicleId);

	/** Open reminders not notified yet: the daily check decides which are due. */
	List<MaintenanceReminder> findAllByDoneAtIsNullAndNotifiedAtIsNull();

	void deleteAllByVehicleId(Long vehicleId);

}
