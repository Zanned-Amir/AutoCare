package tn.autocare.diagnostic.service;

import java.util.List;

import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.diagnostic.dto.QuestionResponse;
import tn.autocare.diagnostic.dto.RuleResponse;
import tn.autocare.diagnostic.dto.SaveQuestionRequest;
import tn.autocare.diagnostic.dto.SaveRuleRequest;
import tn.autocare.diagnostic.dto.SaveSymptomRequest;
import tn.autocare.diagnostic.dto.SymptomFlowResponse;
import tn.autocare.diagnostic.dto.SymptomResponse;
import tn.autocare.diagnostic.entity.DiagnosticRule;
import tn.autocare.diagnostic.entity.Question;
import tn.autocare.diagnostic.entity.RuleCondition;
import tn.autocare.diagnostic.entity.Symptom;
import tn.autocare.diagnostic.mapper.DiagnosticMapper;
import tn.autocare.diagnostic.repository.DiagnosticRuleRepository;
import tn.autocare.diagnostic.repository.QuestionRepository;
import tn.autocare.diagnostic.repository.SymptomRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.tx.AfterCommit;

/** Backoffice editor for symptoms, questions and rules. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiagnosticAdminService {

	private final SymptomRepository symptomRepository;

	private final QuestionRepository questionRepository;

	private final DiagnosticRuleRepository ruleRepository;

	private final DiagnosticFlowService flowService;

	private final DiagnosticMapper mapper;

	private final CatalogFacade catalogFacade;

	private final CacheManager cacheManager;

	public List<SymptomResponse> listSymptoms() {
		return symptomRepository.findAllByOrderByPositionAscIdAsc().stream().map(mapper::toResponse).toList();
	}

	public SymptomFlowResponse getSymptomFlow(Long symptomId) {
		return flowService.getSymptomFlow(symptomId);
	}

	@Transactional
	public SymptomResponse createSymptom(SaveSymptomRequest request) {
		return mapper.toResponse(symptomRepository
			.save(Symptom.create(request.label(), request.description(), request.position(), request.active())));
	}

	@Transactional
	public SymptomResponse updateSymptom(Long symptomId, SaveSymptomRequest request) {
		evictFlowAfterCommit(symptomId);
		Symptom symptom = findSymptom(symptomId);
		symptom.updateDetails(request.label(), request.description(), request.position(), request.active());
		return mapper.toResponse(symptom);
	}

	@Transactional
	public QuestionResponse createQuestion(Long symptomId, SaveQuestionRequest request) {
		evictFlowAfterCommit(symptomId);
		findSymptom(symptomId);
		checkQuestion(request);
		return mapper.toResponse(questionRepository.save(Question.create(symptomId, request.text(),
				request.answerType(), trim(request.options()), request.position())));
	}

	/** A change that would break a rule using this question is refused. */
	@Transactional
	public QuestionResponse updateQuestion(Long symptomId, Long questionId, SaveQuestionRequest request) {
		evictFlowAfterCommit(symptomId);
		checkQuestion(request);
		Question question = findQuestion(symptomId, questionId);
		question.updateDetails(request.text(), request.answerType(), trim(request.options()), request.position());
		QuestionResponse updated = mapper.toResponse(question);
		for (DiagnosticRule rule : ruleRepository.findAllBySymptomIdOrderByPriorityDescIdAsc(symptomId)) {
			boolean broken = rule.getConditions()
				.stream()
				.filter(condition -> condition.questionId().equals(questionId))
				.anyMatch(condition -> !DiagnosticRuleEngine.isValidCondition(condition, updated));
			if (broken) {
				throw new AppException(ErrorCode.DIAGNOSTIC_QUESTION_IN_USE, "Rule " + rule.getId() + " would break");
			}
		}
		return updated;
	}

	@Transactional
	public void deleteQuestion(Long symptomId, Long questionId) {
		evictFlowAfterCommit(symptomId);
		Question question = findQuestion(symptomId, questionId);
		if (ruleRepository.findAllBySymptomIdOrderByPriorityDescIdAsc(symptomId)
			.stream()
			.anyMatch(rule -> rule.usesQuestion(questionId))) {
			throw new AppException(ErrorCode.DIAGNOSTIC_QUESTION_IN_USE, "A rule uses question " + questionId);
		}
		questionRepository.delete(question);
	}

	@Transactional
	public RuleResponse createRule(Long symptomId, SaveRuleRequest request) {
		evictFlowAfterCommit(symptomId);
		findSymptom(symptomId);
		checkRule(symptomId, request);
		DiagnosticRule rule = ruleRepository
			.save(DiagnosticRule.create(symptomId, request.name(), request.conditions(), request.priority(),
					request.possibleCause(), request.recommendation(), request.serviceId(), request.urgency()));
		return flowService.toResponse(rule);
	}

	@Transactional
	public RuleResponse updateRule(Long symptomId, Long ruleId, SaveRuleRequest request) {
		evictFlowAfterCommit(symptomId);
		checkRule(symptomId, request);
		DiagnosticRule rule = ruleRepository.findByIdAndSymptomId(ruleId, symptomId)
			.orElseThrow(() -> AppException.notFound("Rule", ruleId));
		rule.updateDetails(request.name(), request.conditions(), request.priority(), request.possibleCause(),
				request.recommendation(), request.serviceId(), request.urgency());
		return flowService.toResponse(rule);
	}

	@Transactional
	public void deleteRule(Long symptomId, Long ruleId) {
		evictFlowAfterCommit(symptomId);
		ruleRepository.delete(ruleRepository.findByIdAndSymptomId(ruleId, symptomId)
			.orElseThrow(() -> AppException.notFound("Rule", ruleId)));
	}

	/**
	 * After the commit, so a reader in between cannot cache the old flow again for an
	 * hour. {@code evictIfPresent()}, not {@code evict()}/{@code clear()} (what
	 * {@code @CacheEvict} uses): those may run later, so a read right after the save
	 * could still get the old flow.
	 */
	private void evictFlowAfterCommit(Long symptomId) {
		AfterCommit.run(() -> {
			var cache = cacheManager.getCache(DiagnosticFlowService.FLOWS_CACHE);
			if (cache != null) {
				cache.evictIfPresent(symptomId);
			}
		});
	}

	private void checkQuestion(SaveQuestionRequest request) {
		if (!DiagnosticRuleEngine.isValidQuestion(request.answerType(), request.options())) {
			throw new AppException(ErrorCode.DIAGNOSTIC_QUESTION_INVALID,
					"Choice questions need at least two different choices");
		}
	}

	private void checkRule(Long symptomId, SaveRuleRequest request) {
		List<QuestionResponse> questions = questionRepository.findAllBySymptomIdOrderByPositionAscIdAsc(symptomId)
			.stream()
			.map(mapper::toResponse)
			.toList();
		for (RuleCondition condition : request.conditions()) {
			QuestionResponse question = questions.stream()
				.filter(q -> q.id().equals(condition.questionId()))
				.findFirst()
				.orElseThrow(() -> new AppException(ErrorCode.DIAGNOSTIC_RULE_INVALID,
						"Question " + condition.questionId() + " is not part of this symptom"));
			if (!DiagnosticRuleEngine.isValidCondition(condition, question)) {
				throw new AppException(ErrorCode.DIAGNOSTIC_RULE_INVALID,
						"Condition does not fit question " + question.id());
			}
		}
		if (request.serviceId() != null && !catalogFacade.existsActiveAutoService(request.serviceId())) {
			throw new AppException(ErrorCode.DIAGNOSTIC_RULE_INVALID, "Unknown service " + request.serviceId());
		}
	}

	private Symptom findSymptom(Long symptomId) {
		return symptomRepository.findById(symptomId).orElseThrow(() -> AppException.notFound("Symptom", symptomId));
	}

	private Question findQuestion(Long symptomId, Long questionId) {
		return questionRepository.findByIdAndSymptomId(questionId, symptomId)
			.orElseThrow(() -> AppException.notFound("Question", questionId));
	}

	private static List<String> trim(List<String> options) {
		return options.stream().map(String::trim).toList();
	}

}
