package tn.autocare.helpdesk.entity;

public enum TicketPriority {

	LOW, NORMAL, HIGH, URGENT;

	public TicketPriority raised() {
		return this == URGENT ? URGENT : values()[ordinal() + 1];
	}

}
