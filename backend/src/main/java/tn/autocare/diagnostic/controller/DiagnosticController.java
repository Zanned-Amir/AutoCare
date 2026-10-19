package tn.autocare.diagnostic.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.diagnostic.api.DiagnosticPermissions;
import tn.autocare.diagnostic.dto.DiagnosticResponse;
import tn.autocare.diagnostic.dto.RunDiagnosticRequest;
import tn.autocare.diagnostic.dto.SymptomQuestionsResponse;
import tn.autocare.diagnostic.dto.SymptomResponse;
import tn.autocare.diagnostic.service.DiagnosticService;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Diagnostics")
@RestController
@RequestMapping("/diagnostics")
@RequiredArgsConstructor
@PreAuthorize("@perm.has('" + DiagnosticPermissions.DIAGNOSTIC_USE + "')")
public class DiagnosticController {

	private final DiagnosticService diagnosticService;

	@GetMapping("/symptoms")
	public List<SymptomResponse> listActiveSymptoms() {
		return diagnosticService.listActiveSymptoms();
	}

	@GetMapping("/symptoms/{symptomId}")
	public SymptomQuestionsResponse getSymptomQuestions(@PathVariable Long symptomId) {
		return diagnosticService.getSymptomQuestions(symptomId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public DiagnosticResponse runDiagnostic(@Valid @RequestBody RunDiagnosticRequest request) {
		return diagnosticService.runDiagnostic(CurrentUser.id(), request);
	}

	@GetMapping
	public PagedModel<DiagnosticResponse> listMyDiagnostics(
			@PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(diagnosticService.listMyDiagnostics(CurrentUser.id(), pageable));
	}

	@GetMapping("/{diagnosticId}")
	public DiagnosticResponse getMyDiagnostic(@PathVariable Long diagnosticId) {
		return diagnosticService.getMyDiagnostic(CurrentUser.id(), diagnosticId);
	}

}
