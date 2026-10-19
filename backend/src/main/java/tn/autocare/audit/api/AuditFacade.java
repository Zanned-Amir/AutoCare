package tn.autocare.audit.api;

/**
 * Reserved for modules that need to write a record synchronously. Today every record
 * comes from an event (see {@code tn.autocare.audit.event.AuditEventsListener}), so no
 * module calls the audit module.
 */
public interface AuditFacade {

}
