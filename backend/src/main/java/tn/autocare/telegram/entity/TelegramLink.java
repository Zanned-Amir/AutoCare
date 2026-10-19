package tn.autocare.telegram.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

/** A user's Telegram chat. One per user; linking again replaces it. */
@Getter
@Entity
@Table(schema = "telegram", name = "telegram_links")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TelegramLink extends BaseEntity {

	@Column(name = "user_id", nullable = false, unique = true)
	private Long userId;

	@Column(name = "chat_id", nullable = false, length = 32)
	private String chatId;

	@Column(length = 64)
	private String username;

	@Column(name = "linked_at", nullable = false)
	private Instant linkedAt;

	public static TelegramLink link(Long userId, String chatId, String username) {
		TelegramLink link = new TelegramLink();
		link.userId = userId;
		link.relink(chatId, username);
		return link;
	}

	public void relink(String chatId, String username) {
		this.chatId = chatId;
		this.username = username;
		this.linkedAt = Instant.now();
	}

}
