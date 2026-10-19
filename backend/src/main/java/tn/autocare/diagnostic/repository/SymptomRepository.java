package tn.autocare.diagnostic.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.diagnostic.entity.Symptom;

public interface SymptomRepository extends JpaRepository<Symptom, Long> {

	List<Symptom> findAllByOrderByPositionAscIdAsc();

	List<Symptom> findAllByActiveTrueOrderByPositionAscIdAsc();

}
