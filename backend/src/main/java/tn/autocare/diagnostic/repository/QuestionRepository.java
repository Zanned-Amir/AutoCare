package tn.autocare.diagnostic.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.diagnostic.entity.Question;

public interface QuestionRepository extends JpaRepository<Question, Long> {

	List<Question> findAllBySymptomIdOrderByPositionAscIdAsc(Long symptomId);

	Optional<Question> findByIdAndSymptomId(Long id, Long symptomId);

}
