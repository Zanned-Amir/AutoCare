package tn.autocare.helpdesk.entity;

/**
 * WAITING_ON_CUSTOMER pauses the resolution SLA. RESOLVED reopens on a customer reply;
 * CLOSED is final.
 */
public enum TicketStatus {

	OPEN, IN_PROGRESS, WAITING_ON_CUSTOMER, RESOLVED, CLOSED

}
