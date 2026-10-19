package tn.autocare.shared.mail;

import java.nio.charset.StandardCharsets;
import java.time.Year;

import org.springframework.context.MessageSource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.shared.config.WebAppProperties;

@Slf4j
@Component
@RequiredArgsConstructor
class AsyncMailSender {

	private final JavaMailSender javaMailSender;

	private final ITemplateEngine templateEngine;

	private final MessageSource messageSource;

	private final MailContentProperties mailContent;

	private final WebAppProperties webApp;

	@Async
	public void send(MailMessage message) {
		try {
			MimeMessage mime = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
			helper.setFrom(mailContent.from());
			helper.setTo(message.to());
			helper.setSubject(
					messageSource.getMessage("mail." + message.template() + ".subject", null, message.locale()));
			helper.setText(render(message), true);
			javaMailSender.send(mime);
		}
		catch (Exception ex) {
			// A lost e-mail can be re-requested by the user; never fail the request that
			// triggered it.
			log.error("Could not send '{}' to {}", message.template(), message.to(), ex);
		}
	}

	String render(MailMessage message) {
		Context context = new Context(message.locale());
		context.setVariables(message.variables());
		context.setVariable("webUrl", webApp.baseUrl());
		context.setVariable("supportEmail", mailContent.supportEmail());
		context.setVariable("year", Year.now().getValue());
		return templateEngine.process("mail/" + message.template(), context);
	}

}
