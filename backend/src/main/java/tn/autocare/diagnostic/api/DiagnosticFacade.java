package tn.autocare.diagnostic.api;

import java.util.Optional;

public interface DiagnosticFacade {

	Optional<DiagnosticResultDto> findDiagnostic(Long diagnosticId);

}
