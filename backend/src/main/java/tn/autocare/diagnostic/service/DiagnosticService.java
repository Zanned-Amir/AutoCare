package tn.autocare.diagnostic.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.diagnostic.dto.DiagnosticResponse;
import tn.autocare.diagnostic.dto.RuleResponse;
import tn.autocare.diagnostic.dto.RunDiagnosticRequest;
import tn.autocare.diagnostic.dto.SuggestedService;
import tn.autocare.diagnostic.dto.SymptomFlowResponse;
import tn.autocare.diagnostic.dto.SymptomQuestionsResponse;
import tn.autocare.diagnostic.dto.SymptomResponse;
import tn.autocare.diagnostic.entity.Diagnostic;
import tn.autocare.diagnostic.entity.Symptom;
import tn.autocare.diagnostic.mapper.DiagnosticMapper;
import tn.autocare.diagnostic.repository.DiagnosticRepository;
import tn.autocare.diagnostic.repository.SymptomRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.vehicle.api.VehicleFacade;

/** The client's side: pick a symptom, answer, get a result. Informative only. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiagnosticService {

	private final SymptomRepository symptomRepository;

	private final DiagnosticRepository diagnosticRepository;

	private final DiagnosticFlowService flowService;

	private final DiagnosticMapper mapper;

	private final VehicleFacade vehicleFacade;

	private final CatalogFacade catalogFacade;

	public List<SymptomResponse> listActiveSymptoms() {
		return symptomRepository.findAllByActiveTrueOrderByPositionAscIdAsc().stream().map(mapper::toResponse).toList();
	}

	public SymptomQuestionsResponse getSymptomQuestions(Long symptomId) {
		SymptomFlowResponse flow = activeFlow(symptomId);
		return new SymptomQuestionsResponse(flow.symptom(), flow.questions());
	}

	@Transactional
	public DiagnosticResponse runDiagnostic(Long userId, RunDiagnosticRequest request) {
		SymptomFlowResponse flow = activeFlow(request.symptomId());
		if (request.vehicleId() != null && !vehicleFacade.isVehicleOwnedBy(request.vehicleId(), userId)) {
			throw AppException.notFound("Vehicle", request.vehicleId());
		}
		Map<Long, List<String>> answers = DiagnosticRuleEngine.normalizeAnswers(flow.questions(), request.answers());
		RuleResponse rule = DiagnosticRuleEngine.pickRule(flow.rules(), answers).orElse(null);

		Map<String, List<String>> stored = new LinkedHashMap<>();
		answers.forEach((questionId, values) -> stored.put(questionId.toString(), values));
		Diagnostic diagnostic = rule == null
				? Diagnostic.record(userId, request.vehicleId(), request.symptomId(), stored, null, null, null, null,
						null)
				: Diagnostic.record(userId, request.vehicleId(), request.symptomId(), stored, rule.id(),
						rule.possibleCause(), rule.recommendation(), rule.serviceId(), rule.urgency());
		return toResponse(diagnosticRepository.save(diagnostic), flow.symptom().label());
	}

	public Page<DiagnosticResponse> listMyDiagnostics(Long userId, Pageable pageable) {
		Page<Diagnostic> page = diagnosticRepository.findAllByUserId(userId, pageable);
		Map<Long, String> labels = symptomRepository
			.findAllById(page.map(Diagnostic::getSymptomId).getContent().stream().distinct().toList())
			.stream()
			.collect(Collectors.toMap(Symptom::getId, Symptom::getLabel));
		return page.map(diagnostic -> toResponse(diagnostic, labels.get(diagnostic.getSymptomId())));
	}

	public DiagnosticResponse getMyDiagnostic(Long userId, Long diagnosticId) {
		Diagnostic diagnostic = diagnosticRepository.findByIdAndUserId(diagnosticId, userId)
			.orElseThrow(() -> AppException.notFound("Diagnostic", diagnosticId));
		String label = symptomRepository.findById(diagnostic.getSymptomId()).map(Symptom::getLabel).orElse(null);
		return toResponse(diagnostic, label);
	}

	private SymptomFlowResponse activeFlow(Long symptomId) {
		SymptomFlowResponse flow = flowService.getSymptomFlow(symptomId);
		if (!flow.symptom().active()) {
			throw AppException.notFound("Symptom", symptomId);
		}
		return flow;
	}

	private DiagnosticResponse toResponse(Diagnostic diagnostic, String symptomLabel) {
		SuggestedService service = diagnostic.getServiceId() == null ? null
				: catalogFacade.findAutoService(diagnostic.getServiceId())
					.filter(AutoServiceDto::active)
					.map(found -> new SuggestedService(found.id(), found.name()))
					.orElse(null);
		return new DiagnosticResponse(diagnostic.getId(), diagnostic.getSymptomId(), symptomLabel,
				diagnostic.getVehicleId(), diagnostic.isMatched(), diagnostic.getPossibleCause(),
				diagnostic.getRecommendation(), diagnostic.getUrgency(), service, diagnostic.getAnswers(),
				diagnostic.getCreatedAt());
	}

}
