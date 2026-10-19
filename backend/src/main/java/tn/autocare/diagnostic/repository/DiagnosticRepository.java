package tn.autocare.diagnostic.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.diagnostic.entity.Diagnostic;

public interface DiagnosticRepository extends JpaRepository<Diagnostic, Long> {

	Page<Diagnostic> findAllByUserId(Long userId, Pageable pageable);

	Optional<Diagnostic> findByIdAndUserId(Long id, Long userId);

}
