package tn.autocare.helpdesk.dto;

import tn.autocare.helpdesk.entity.TicketCategory;
import tn.autocare.helpdesk.entity.TicketPriority;

public record UpdateTicketRequest(TicketPriority priority, TicketCategory category) {
}
