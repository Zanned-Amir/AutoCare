package tn.autocare.diagnostic.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.diagnostic.api.DiagnosticPermissions;
import tn.autocare.diagnostic.dto.QuestionResponse;
import tn.autocare.diagnostic.dto.RuleResponse;
import tn.autocare.diagnostic.dto.SaveQuestionRequest;
import tn.autocare.diagnostic.dto.SaveRuleRequest;
import tn.autocare.diagnostic.dto.SaveSymptomRequest;
import tn.autocare.diagnostic.dto.SymptomFlowResponse;
import tn.autocare.diagnostic.dto.SymptomResponse;
import tn.autocare.diagnostic.service.DiagnosticAdminService;

@Tag(name = "Admin - Diagnostics")
@RestController
@RequestMapping("/admin/diagnostics/symptoms")
@RequiredArgsConstructor
@PreAuthorize("@perm.has('" + DiagnosticPermissions.DIAGNOSTIC_MANAGE + "')")
public class AdminDiagnosticController {

	private final DiagnosticAdminService adminService;

	@GetMapping
	public List<SymptomResponse> listSymptoms() {
		return adminService.listSymptoms();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public SymptomResponse createSymptom(@Valid @RequestBody SaveSymptomRequest request) {
		return adminService.createSymptom(request);
	}

	@GetMapping("/{symptomId}")
	public SymptomFlowResponse getSymptomFlow(@PathVariable Long symptomId) {
		return adminService.getSymptomFlow(symptomId);
	}

	@PutMapping("/{symptomId}")
	public SymptomResponse updateSymptom(@PathVariable Long symptomId, @Valid @RequestBody SaveSymptomRequest request) {
		return adminService.updateSymptom(symptomId, request);
	}

	@PostMapping("/{symptomId}/questions")
	@ResponseStatus(HttpStatus.CREATED)
	public QuestionResponse createQuestion(@PathVariable Long symptomId,
			@Valid @RequestBody SaveQuestionRequest request) {
		return adminService.createQuestion(symptomId, request);
	}

	@PutMapping("/{symptomId}/questions/{questionId}")
	public QuestionResponse updateQuestion(@PathVariable Long symptomId, @PathVariable Long questionId,
			@Valid @RequestBody SaveQuestionRequest request) {
		return adminService.updateQuestion(symptomId, questionId, request);
	}

	@DeleteMapping("/{symptomId}/questions/{questionId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteQuestion(@PathVariable Long symptomId, @PathVariable Long questionId) {
		adminService.deleteQuestion(symptomId, questionId);
	}

	@PostMapping("/{symptomId}/rules")
	@ResponseStatus(HttpStatus.CREATED)
	public RuleResponse createRule(@PathVariable Long symptomId, @Valid @RequestBody SaveRuleRequest request) {
		return adminService.createRule(symptomId, request);
	}

	@PutMapping("/{symptomId}/rules/{ruleId}")
	public RuleResponse updateRule(@PathVariable Long symptomId, @PathVariable Long ruleId,
			@Valid @RequestBody SaveRuleRequest request) {
		return adminService.updateRule(symptomId, ruleId, request);
	}

	@DeleteMapping("/{symptomId}/rules/{ruleId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteRule(@PathVariable Long symptomId, @PathVariable Long ruleId) {
		adminService.deleteRule(symptomId, ruleId);
	}

}
