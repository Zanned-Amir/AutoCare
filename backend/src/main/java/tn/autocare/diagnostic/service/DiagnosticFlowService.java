package tn.autocare.diagnostic.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.diagnostic.dto.RuleResponse;
import tn.autocare.diagnostic.dto.SymptomFlowResponse;
import tn.autocare.diagnostic.entity.DiagnosticRule;
import tn.autocare.diagnostic.mapper.DiagnosticMapper;
import tn.autocare.diagnostic.repository.DiagnosticRuleRepository;
import tn.autocare.diagnostic.repository.QuestionRepository;
import tn.autocare.diagnostic.repository.SymptomRepository;
import tn.autocare.shared.exception.AppException;

/**
 * Symptom, questions and rules in one cached value; every backoffice change evicts it.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiagnosticFlowService {

	public static final String FLOWS_CACHE = "diagnostic-flows";

	private final SymptomRepository symptomRepository;

	private final QuestionRepository questionRepository;

	private final DiagnosticRuleRepository ruleRepository;

	private final DiagnosticMapper mapper;

	private final CatalogFacade catalogFacade;

	@Cacheable(FLOWS_CACHE)
	public SymptomFlowResponse getSymptomFlow(Long symptomId) {
		var symptom = symptomRepository.findById(symptomId)
			.orElseThrow(() -> AppException.notFound("Symptom", symptomId));
		var questions = questionRepository.findAllBySymptomIdOrderByPositionAscIdAsc(symptomId)
			.stream()
			.map(mapper::toResponse)
			.toList();
		var rules = ruleRepository.findAllBySymptomIdOrderByPriorityDescIdAsc(symptomId)
			.stream()
			.map(this::toResponse)
			.toList();
		return new SymptomFlowResponse(mapper.toResponse(symptom), questions, rules);
	}

	RuleResponse toResponse(DiagnosticRule rule) {
		String serviceName = rule.getServiceId() == null ? null
				: catalogFacade.findAutoService(rule.getServiceId()).map(AutoServiceDto::name).orElse(null);
		return new RuleResponse(rule.getId(), rule.getSymptomId(), rule.getName(), rule.getConditions(),
				rule.getPriority(), rule.getPossibleCause(), rule.getRecommendation(), rule.getServiceId(), serviceName,
				rule.getUrgency());
	}

}
