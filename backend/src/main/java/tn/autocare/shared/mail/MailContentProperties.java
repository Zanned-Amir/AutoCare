package tn.autocare.shared.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/** Sender and support address shown in e-mails (the SMTP server is spring.mail.*). */
@Validated
@ConfigurationProperties(prefix = "autocare.mail")
public record MailContentProperties(@NotBlank String from, @NotBlank String supportEmail) {
}
