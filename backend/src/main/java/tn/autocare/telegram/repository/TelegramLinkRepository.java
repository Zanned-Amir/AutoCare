package tn.autocare.telegram.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.telegram.entity.TelegramLink;

public interface TelegramLinkRepository extends JpaRepository<TelegramLink, Long> {

	Optional<TelegramLink> findByUserId(Long userId);

	Optional<TelegramLink> findByChatId(String chatId);

	void deleteByUserId(Long userId);

}
