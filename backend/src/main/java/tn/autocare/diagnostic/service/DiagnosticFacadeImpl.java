package tn.autocare.diagnostic.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.diagnostic.api.DiagnosticFacade;
import tn.autocare.diagnostic.api.DiagnosticResultDto;
import tn.autocare.diagnostic.repository.DiagnosticRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class DiagnosticFacadeImpl implements DiagnosticFacade {

	private final DiagnosticRepository diagnosticRepository;

	@Override
	public Optional<DiagnosticResultDto> findDiagnostic(Long diagnosticId) {
		return diagnosticRepository.findById(diagnosticId)
			.map(d -> new DiagnosticResultDto(d.getId(), d.getUserId(), d.getVehicleId(), d.getSymptomId(),
					d.getPossibleCause(), d.getRecommendation(), d.getServiceId()));
	}

}
