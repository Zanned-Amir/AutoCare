package tn.autocare.shared.tx;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Runs an action after the current transaction commits (right away when there is none).
 */
public final class AfterCommit {

	private AfterCommit() {
	}

	public static void run(Runnable action) {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					action.run();
				}
			});
		}
		else {
			action.run();
		}
	}

	/**
	 * Runs only if the current transaction rolls back (e.g. remove an uploaded object).
	 */
	public static void onRollback(Runnable action) {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCompletion(int status) {
					if (status == STATUS_ROLLED_BACK) {
						action.run();
					}
				}
			});
		}
	}

}
