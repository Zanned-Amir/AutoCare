package tn.autocare.helpdesk.service;

import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.helpdesk.entity.Ticket;
import tn.autocare.shared.config.WebAppProperties;
import tn.autocare.shared.i18n.SupportedLocales;
import tn.autocare.shared.mail.MailMessage;
import tn.autocare.shared.mail.MailService;

/** E-mails to the customer (template: helpdesk.notifier). */
@Component
@RequiredArgsConstructor
class HelpdeskNotifier {

	private final MailService mailService;

	private final AuthFacade authFacade;

	private final WebAppProperties webApp;

	void notifyAgentReply(Ticket ticket, String body) {
		send(ticket, "helpdesk-ticket-reply", body.length() > 600 ? body.substring(0, 600) + "…" : body);
	}

	void notifyResolved(Ticket ticket) {
		send(ticket, "helpdesk-ticket-resolved", null);
	}

	private void send(Ticket ticket, String template, String excerpt) {
		authFacade.findUser(ticket.getCustomerId()).ifPresent(customer -> {
			Locale locale = SupportedLocales.fromTag(customer.locale());
			Map<String, Object> variables = new java.util.HashMap<>();
			variables.put("name", customer.fullName());
			variables.put("ticketId", ticket.getPublicId());
			variables.put("subject", ticket.getSubject());
			variables.put("link", webApp.baseUrl() + "/support/" + ticket.getPublicId());
			if (excerpt != null) {
				variables.put("excerpt", excerpt);
			}
			mailService.send(new MailMessage(customer.email(), locale, template, Map.copyOf(variables)));
		});
	}

}
