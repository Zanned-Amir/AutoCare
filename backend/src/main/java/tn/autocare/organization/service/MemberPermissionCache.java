package tn.autocare.organization.service;

import java.util.List;
import java.util.Objects;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import tn.autocare.organization.entity.OrganizationMember;
import tn.autocare.organization.repository.OrganizationMemberRepository;
import tn.autocare.shared.tx.AfterCommit;

/**
 * Permissions of one user in one organization, cached in Redis under
 * {@code autocare:organization-member-permissions::{orgId}:{userId}}. Not a member, or
 * not active = empty list. Every change to a member must call {@link #evict}.
 */
@Component
public class MemberPermissionCache {

	public static final String CACHE_NAME = "organization-member-permissions";

	private final Cache cache;

	private final OrganizationMemberRepository memberRepository;

	MemberPermissionCache(CacheManager cacheManager, OrganizationMemberRepository memberRepository) {
		this.cache = Objects.requireNonNull(cacheManager.getCache(CACHE_NAME));
		this.memberRepository = memberRepository;
	}

	public List<String> getPermissions(Long organizationId, Long userId) {
		return cache.get(key(organizationId, userId),
				() -> memberRepository.findByOrganizationIdAndUserId(organizationId, userId)
					.filter(OrganizationMember::isActive)
					.map(member -> List.copyOf(member.getPermissions()))
					.orElse(List.of()));
	}

	/**
	 * After the commit, so a permission check in between cannot cache the old permissions
	 * again; {@code evictIfPresent()} because {@code evict()} may run later.
	 */
	public void evict(Long organizationId, Long userId) {
		String key = key(organizationId, userId);
		AfterCommit.run(() -> cache.evictIfPresent(key));
	}

	private static String key(Long organizationId, Long userId) {
		return organizationId + ":" + userId;
	}

}
