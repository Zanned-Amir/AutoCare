package tn.autocare.shared.mail;

import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import lombok.RequiredArgsConstructor;

/**
 * Sends e-mails in the background. Inside a transaction the mail leaves only after the
 * commit, so a rolled-back change never sends a link that does not work.
 */
@Service
@RequiredArgsConstructor
public class MailService {

	private final AsyncMailSender asyncMailSender;

	public void send(MailMessage message) {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					asyncMailSender.send(message);
				}
			});
		}
		else {
			asyncMailSender.send(message);
		}
	}

}
