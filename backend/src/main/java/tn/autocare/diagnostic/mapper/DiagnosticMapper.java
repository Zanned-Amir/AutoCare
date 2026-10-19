package tn.autocare.diagnostic.mapper;

import org.mapstruct.Mapper;

import tn.autocare.diagnostic.dto.QuestionResponse;
import tn.autocare.diagnostic.dto.SymptomResponse;
import tn.autocare.diagnostic.entity.Question;
import tn.autocare.diagnostic.entity.Symptom;

@Mapper
public interface DiagnosticMapper {

	SymptomResponse toResponse(Symptom symptom);

	QuestionResponse toResponse(Question question);

}
