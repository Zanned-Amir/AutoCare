package tn.autocare.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.catalog.entity.AutoService;

public interface AutoServiceRepository extends JpaRepository<AutoService, Long> {

	List<AutoService> findAllByActiveTrueOrderByNameAsc();

	boolean existsByIdAndActiveTrue(Long id);

	boolean existsByNameIgnoreCase(String name);

	Optional<AutoService> findByNameIgnoreCase(String name);

	Page<AutoService> findAllByNameContainingIgnoreCase(String name, Pageable pageable);

	Page<AutoService> findAllByNameContainingIgnoreCaseAndActive(String name, boolean active, Pageable pageable);

}
