package tn.autocare.maintenance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.maintenance.entity.MaintenanceRecord;

public interface MaintenanceRecordRepository extends JpaRepository<MaintenanceRecord, Long> {

	List<MaintenanceRecord> findAllByVehicleIdOrderByDateDescIdDesc(Long vehicleId);

	Optional<MaintenanceRecord> findByIdAndVehicleId(Long id, Long vehicleId);

	Optional<MaintenanceRecord> findByIdAndOrganizationId(Long id, Long organizationId);

	Page<MaintenanceRecord> findAllByOrganizationId(Long organizationId, Pageable pageable);

	boolean existsByServiceRequestId(Long serviceRequestId);

	void deleteAllByVehicleId(Long vehicleId);

}
