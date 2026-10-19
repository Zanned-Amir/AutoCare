package tn.autocare.helpdesk.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.helpdesk.api.HelpdeskPermissions;
import tn.autocare.helpdesk.dto.AgentReplyRequest;
import tn.autocare.helpdesk.dto.AgentTicketResponse;
import tn.autocare.helpdesk.dto.AssignTicketRequest;
import tn.autocare.helpdesk.dto.ChangeTicketStatusRequest;
import tn.autocare.helpdesk.dto.EscalateTicketRequest;
import tn.autocare.helpdesk.dto.HelpdeskStatsResponse;
import tn.autocare.helpdesk.dto.SlaPolicyResponse;
import tn.autocare.helpdesk.dto.TicketEventResponse;
import tn.autocare.helpdesk.dto.TicketMessageResponse;
import tn.autocare.helpdesk.dto.UpdateSlaPolicyRequest;
import tn.autocare.helpdesk.dto.UpdateTicketRequest;
import tn.autocare.helpdesk.entity.TicketPriority;
import tn.autocare.helpdesk.entity.TicketStatus;
import tn.autocare.helpdesk.service.AgentTicketService;
import tn.autocare.helpdesk.service.SlaPolicyService;
import tn.autocare.shared.security.CurrentUser;

/**
 * Support agents' workspace (template: helpdesk/agent and admin/helpdesk). Backoffice
 * sessions only.
 */
@Tag(name = "Admin - Helpdesk")
@RestController
@RequestMapping("/admin/helpdesk")
@RequiredArgsConstructor
@PreAuthorize("@perm.has('" + HelpdeskPermissions.TICKET_MANAGE + "')")
public class AdminHelpdeskController {

	private final AgentTicketService agentTicketService;

	private final SlaPolicyService slaPolicyService;

	@GetMapping("/stats")
	public HelpdeskStatsResponse getHelpdeskStats() {
		return agentTicketService.getHelpdeskStats(CurrentUser.id());
	}

	@GetMapping("/queue")
	public List<AgentTicketResponse> listHelpdeskQueue(@RequestParam(defaultValue = "50") int size) {
		return agentTicketService.listQueue(Math.min(size, 200));
	}

	@GetMapping("/tickets")
	public PagedModel<AgentTicketResponse> searchTickets(@RequestParam(required = false) TicketStatus status,
			@RequestParam(required = false) TicketPriority priority, @RequestParam(required = false) String assignee,
			@RequestParam(required = false) String q,
			@PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(
				agentTicketService.searchTickets(CurrentUser.id(), status, priority, assignee, q, pageable));
	}

	@GetMapping("/tickets/{publicId}")
	public AgentTicketResponse getAgentTicket(@PathVariable String publicId) {
		return agentTicketService.getTicket(publicId);
	}

	@GetMapping("/tickets/{publicId}/messages")
	public List<TicketMessageResponse> listAgentTicketMessages(@PathVariable String publicId) {
		return agentTicketService.listTicketMessages(publicId);
	}

	@GetMapping("/tickets/{publicId}/events")
	public List<TicketEventResponse> listTicketEvents(@PathVariable String publicId) {
		return agentTicketService.listTicketEvents(publicId);
	}

	@PostMapping("/tickets/{publicId}/pick")
	public AgentTicketResponse pickTicket(@PathVariable String publicId) {
		return agentTicketService.assignTicket(CurrentUser.id(), publicId, CurrentUser.id());
	}

	@PostMapping("/tickets/{publicId}/release")
	public AgentTicketResponse releaseTicket(@PathVariable String publicId) {
		return agentTicketService.assignTicket(CurrentUser.id(), publicId, null);
	}

	@PostMapping("/tickets/{publicId}/assign")
	public AgentTicketResponse assignTicket(@PathVariable String publicId,
			@Valid @RequestBody AssignTicketRequest request) {
		return agentTicketService.assignTicket(CurrentUser.id(), publicId, request.agentId());
	}

	@PostMapping("/tickets/{publicId}/messages")
	@ResponseStatus(HttpStatus.CREATED)
	public TicketMessageResponse replyAsAgent(@PathVariable String publicId,
			@Valid @RequestBody AgentReplyRequest request) {
		return agentTicketService.replyAsAgent(CurrentUser.id(), publicId, request);
	}

	@PatchMapping("/tickets/{publicId}/status")
	public AgentTicketResponse changeTicketStatus(@PathVariable String publicId,
			@Valid @RequestBody ChangeTicketStatusRequest request) {
		return agentTicketService.changeTicketStatus(CurrentUser.id(), publicId, request.status());
	}

	@PatchMapping("/tickets/{publicId}")
	public AgentTicketResponse updateTicket(@PathVariable String publicId,
			@Valid @RequestBody UpdateTicketRequest request) {
		return agentTicketService.updateTicket(CurrentUser.id(), publicId, request);
	}

	@PostMapping("/tickets/{publicId}/escalate")
	public AgentTicketResponse escalateTicket(@PathVariable String publicId,
			@Valid @RequestBody(required = false) EscalateTicketRequest request) {
		return agentTicketService.escalateTicket(CurrentUser.id(), publicId, request == null ? null : request.reason());
	}

	@GetMapping("/sla-policies")
	public List<SlaPolicyResponse> listSlaPolicies() {
		return slaPolicyService.listSlaPolicies();
	}

	@PutMapping("/sla-policies/{priority}")
	@PreAuthorize("@perm.has('" + HelpdeskPermissions.HELPDESK_CONFIGURE + "')")
	public SlaPolicyResponse updateSlaPolicy(@PathVariable TicketPriority priority,
			@Valid @RequestBody UpdateSlaPolicyRequest request) {
		return slaPolicyService.updateSlaPolicy(priority, request);
	}

}
