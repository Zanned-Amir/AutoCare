package tn.autocare.helpdesk.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.helpdesk.dto.SlaPolicyResponse;
import tn.autocare.helpdesk.dto.UpdateSlaPolicyRequest;
import tn.autocare.helpdesk.entity.SlaPolicy;
import tn.autocare.helpdesk.entity.TicketPriority;
import tn.autocare.helpdesk.repository.SlaPolicyRepository;
import tn.autocare.shared.exception.AppException;

/**
 * SLA policies, one per priority (seeded by Flyway). New values apply to tickets created
 * afterwards.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SlaPolicyService {

	private final SlaPolicyRepository slaPolicyRepository;

	public List<SlaPolicyResponse> listSlaPolicies() {
		return slaPolicyRepository.findAllByOrderByIdAsc().stream().map(SlaPolicyService::toResponse).toList();
	}

	@Transactional
	public SlaPolicyResponse updateSlaPolicy(TicketPriority priority, UpdateSlaPolicyRequest request) {
		SlaPolicy policy = slaPolicyRepository.findByPriority(priority)
			.orElseThrow(() -> AppException.notFound("SLA policy", priority));
		policy.update(request.firstResponseMinutes(), request.resolutionMinutes(), request.active());
		return toResponse(policy);
	}

	private static SlaPolicyResponse toResponse(SlaPolicy p) {
		return new SlaPolicyResponse(p.getPriority(), p.getFirstResponseMinutes(), p.getResolutionMinutes(),
				p.isActive());
	}

}
