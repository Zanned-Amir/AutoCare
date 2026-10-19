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
import org.springframework.web.bind.annotation.RequestParam;
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
import tn.autocare.helpdesk.entity.TicketStatus;
import tn.autocare.helpdesk.service.TicketService;
import tn.autocare.helpdesk.service.TicketService.TicketOwner;
import tn.autocare.shared.security.CurrentUser;

/** A customer's own support tickets. */
@Tag(name = "Helpdesk")
@RestController
@RequestMapping("/helpdesk/tickets")
@RequiredArgsConstructor
public class TicketController {

	private static final String CAN_READ = "@perm.has('" + HelpdeskPermissions.TICKET_READ + "')";

	private final TicketService ticketService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + HelpdeskPermissions.TICKET_CREATE + "')")
	public TicketResponse createTicket(@Valid @RequestBody CreateTicketRequest request) {
		return ticketService.createTicket(CurrentUser.id(), null, request);
	}

	@GetMapping
	@PreAuthorize(CAN_READ)
	public PagedModel<TicketResponse> listMyTickets(@RequestParam(required = false) TicketStatus status,
			@PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(ticketService.listMyTickets(CurrentUser.id(), status, pageable));
	}

	@GetMapping("/{publicId}")
	@PreAuthorize(CAN_READ)
	public TicketResponse getTicket(@PathVariable String publicId) {
		return ticketService.getTicket(TicketOwner.user(CurrentUser.id()), publicId);
	}

	@GetMapping("/{publicId}/messages")
	@PreAuthorize(CAN_READ)
	public List<TicketMessageResponse> listTicketMessages(@PathVariable String publicId) {
		return ticketService.listTicketMessages(TicketOwner.user(CurrentUser.id()), publicId);
	}

	@PostMapping("/{publicId}/messages")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_READ)
	public TicketMessageResponse replyToTicket(@PathVariable String publicId,
			@Valid @RequestBody ReplyRequest request) {
		return ticketService.replyToTicket(TicketOwner.user(CurrentUser.id()), publicId, request.body());
	}

	@PostMapping("/{publicId}/close")
	@PreAuthorize(CAN_READ)
	public TicketResponse closeTicket(@PathVariable String publicId) {
		return ticketService.closeTicket(TicketOwner.user(CurrentUser.id()), publicId);
	}

	@PostMapping("/{publicId}/reopen")
	@PreAuthorize(CAN_READ)
	public TicketResponse reopenTicket(@PathVariable String publicId) {
		return ticketService.reopenTicket(TicketOwner.user(CurrentUser.id()), publicId);
	}

}
