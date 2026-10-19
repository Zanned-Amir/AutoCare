package tn.autocare.diagnostic.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.diagnostic.entity.DiagnosticRule;

public interface DiagnosticRuleRepository extends JpaRepository<DiagnosticRule, Long> {

	List<DiagnosticRule> findAllBySymptomIdOrderByPriorityDescIdAsc(Long symptomId);

	Optional<DiagnosticRule> findByIdAndSymptomId(Long id, Long symptomId);

}
