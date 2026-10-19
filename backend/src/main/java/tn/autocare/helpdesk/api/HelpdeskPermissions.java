package tn.autocare.helpdesk.api;

public final class HelpdeskPermissions {

	/**
	 * Customers: open and follow their own tickets. Org members: their organization's
	 * tickets.
	 */
	public static final String TICKET_CREATE = "ticket:create";

	public static final String TICKET_READ = "ticket:read";

	/** Agents: work the queue from the backoffice. */
	public static final String TICKET_MANAGE = "ticket:manage";

	/** Change SLA policies. */
	public static final String HELPDESK_CONFIGURE = "helpdesk:configure";

	private HelpdeskPermissions() {
	}

}
