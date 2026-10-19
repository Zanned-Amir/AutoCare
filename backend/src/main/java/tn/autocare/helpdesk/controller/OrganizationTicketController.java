package tn.autocare.helpdesk.controller;

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
import tn.autocare.helpdesk.api.HelpdeskPermissions;
import tn.autocare.helpdesk.dto.CreateTicketRequest;
import tn.autocare.helpdesk.dto.ReplyRequest;
import tn.autocare.helpdesk.dto.TicketMessageResponse;
import tn.autocare.helpdesk.dto.TicketResponse;
import tn.autocare.helpdesk.service.TicketService;
import tn.autocare.helpdesk.service.TicketService.TicketOwner;
import tn.autocare.shared.security.CurrentUser;

/**
 * A provider organization's tickets, shared by its members (template:
 * helpdesk/organization).
 */
@Tag(name = "Helpdesk - organization")
@RestController
@RequestMapping("/organizations/{organizationId}/helpdesk/tickets")
@RequiredArgsConstructor
public class OrganizationTicketController {

	private static final String CAN_READ = "@orgPerm.has(#organizationId, '" + HelpdeskPermissions.TICKET_READ + "')";

	private final TicketService ticketService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@orgPerm.has(#organizationId, '" + HelpdeskPermissions.TICKET_CREATE + "')")
	public TicketResponse createOrganizationTicket(@PathVariable Long organizationId,
			@Valid @RequestBody CreateTicketRequest request) {
		return ticketService.createTicket(CurrentUser.id(), organizationId, request);
	}

	@GetMapping
	@PreAuthorize(CAN_READ)
	public PagedModel<TicketResponse> listOrganizationTickets(@PathVariable Long organizationId,
			@PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(ticketService.listOrganizationTickets(organizationId, pageable));
	}

	@GetMapping("/{publicId}")
	@PreAuthorize(CAN_READ)
	public TicketResponse getOrganizationTicket(@PathVariable Long organizationId, @PathVariable String publicId) {
		return ticketService.getTicket(TicketOwner.organization(CurrentUser.id(), organizationId), publicId);
	}

	@GetMapping("/{publicId}/messages")
	@PreAuthorize(CAN_READ)
	public List<TicketMessageResponse> listOrganizationTicketMessages(@PathVariable Long organizationId,
			@PathVariable String publicId) {
		return ticketService.listTicketMessages(TicketOwner.organization(CurrentUser.id(), organizationId), publicId);
	}

	@PostMapping("/{publicId}/messages")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_READ)
	public TicketMessageResponse replyToOrganizationTicket(@PathVariable Long organizationId,
			@PathVariable String publicId, @Valid @RequestBody ReplyRequest request) {
		return ticketService.replyToTicket(TicketOwner.organization(CurrentUser.id(), organizationId), publicId,
				request.body());
	}

}
