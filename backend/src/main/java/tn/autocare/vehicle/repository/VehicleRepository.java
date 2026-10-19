package tn.autocare.vehicle.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.vehicle.entity.Vehicle;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

	List<Vehicle> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);

	Optional<Vehicle> findByIdAndOwnerId(Long id, Long ownerId);

	boolean existsByIdAndOwnerId(Long id, Long ownerId);

}
