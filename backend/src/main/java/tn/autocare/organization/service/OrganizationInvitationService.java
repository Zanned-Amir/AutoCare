package tn.autocare.organization.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.organization.api.OrganizationMemberChanged;
import tn.autocare.organization.api.OrganizationMemberChanged.Change;
import tn.autocare.organization.dto.AcceptInvitationResponse;
import tn.autocare.organization.dto.InvitationPreviewResponse;
import tn.autocare.organization.dto.InvitationResponse;
import tn.autocare.organization.dto.InviteMemberRequest;
import tn.autocare.organization.entity.InvitationStatus;
import tn.autocare.organization.entity.Organization;
import tn.autocare.organization.entity.OrganizationInvitation;
import tn.autocare.organization.entity.OrganizationMember;
import tn.autocare.organization.repository.OrganizationInvitationRepository;
import tn.autocare.organization.repository.OrganizationMemberRepository;
import tn.autocare.shared.config.WebAppProperties;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.i18n.SupportedLocales;
import tn.autocare.shared.mail.MailMessage;
import tn.autocare.shared.mail.MailService;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationInvitationService {

	static final Duration VALIDITY = Duration.ofDays(7);

	private static final SecureRandom RANDOM = new SecureRandom();

	private final OrganizationInvitationRepository invitationRepository;

	private final OrganizationMemberRepository memberRepository;

	private final OrganizationService organizationService;

	private final MemberPermissionCache memberPermissionCache;

	private final AuthFacade authFacade;

	private final MailService mailService;

	private final MessageSource messageSource;

	private final WebAppProperties webApp;

	private final ApplicationEventPublisher events;

	public List<InvitationResponse> listPendingInvitations(Long organizationId) {
		Instant now = Instant.now();
		List<OrganizationInvitation> invitations = invitationRepository
			.findAllByOrganizationIdAndStatusOrderByCreatedAtDesc(organizationId, InvitationStatus.PENDING);
		return invitations.stream().map(invitation -> toResponse(invitation, now)).toList();
	}

	/** Inviting the same e-mail again sends a fresh link and revokes the old one. */
	@Transactional
	public InvitationResponse inviteMember(Long actorId, Long organizationId, InviteMemberRequest request) {
		Organization organization = organizationService.findOrganizationOrThrow(organizationId);
		MemberService.checkRoleFits(request.roleKey(), organization);
		String email = request.email().trim().toLowerCase();
		UserSummary invitee = authFacade.findUserByEmail(email).orElse(null);
		if (invitee != null && memberRepository.existsByOrganizationIdAndUserId(organizationId, invitee.id())) {
			throw new AppException(ErrorCode.MEMBER_ALREADY_EXISTS, "This person is already a member");
		}
		invitationRepository
			.findAllByOrganizationIdAndEmailAndStatus(organizationId, email, InvitationStatus.PENDING)
			.forEach(OrganizationInvitation::revoke);

		String token = generateToken();
		Instant now = Instant.now();
		OrganizationInvitation invitation = OrganizationInvitation.invite(organizationId, email, request.roleKey(),
				hash(token), actorId, now.plus(VALIDITY));
		invitationRepository.save(invitation);
		sendInvitationMail(invitation, organization, actorId, invitee, token);
		return toResponse(invitation, now);
	}

	@Transactional
	public void revokeInvitation(Long organizationId, Long invitationId) {
		OrganizationInvitation invitation = invitationRepository.findByIdAndOrganizationId(invitationId, organizationId)
			.orElseThrow(() -> AppException.notFound("Invitation", invitationId));
		if (invitation.getStatus() == InvitationStatus.PENDING) {
			invitation.revoke();
		}
	}

	public InvitationPreviewResponse previewInvitation(String token) {
		OrganizationInvitation invitation = findByTokenOrThrow(token);
		Organization organization = organizationService.findOrganizationOrThrow(invitation.getOrganizationId());
		return new InvitationPreviewResponse(organization.getName(), organization.getType(), invitation.getEmail(),
				invitation.getRoleKey(), invitation.statusAt(Instant.now()), invitation.getExpiresAt());
	}

	/**
	 * The signed-in account must use the invited e-mail, so a forwarded link cannot be
	 * used by someone else.
	 */
	@Transactional
	public AcceptInvitationResponse acceptInvitation(Long userId, String token) {
		OrganizationInvitation invitation = findByTokenOrThrow(token);
		Instant now = Instant.now();
		if (!invitation.isOpenAt(now)) {
			throw new AppException(ErrorCode.ORGANIZATION_INVITATION_INVALID,
					"This invitation is " + invitation.statusAt(now).name().toLowerCase());
		}
		UserSummary user = authFacade.getUser(userId);
		if (!invitation.isFor(user.email())) {
			throw new AppException(ErrorCode.ORGANIZATION_INVITATION_EMAIL_MISMATCH,
					"This invitation was sent to another e-mail address");
		}
		Long organizationId = invitation.getOrganizationId();
		Organization organization = organizationService.findOrganizationOrThrow(organizationId);
		if (!memberRepository.existsByOrganizationIdAndUserId(organizationId, userId)) {
			MemberService.checkRoleFits(invitation.getRoleKey(), organization);
			memberRepository.save(OrganizationMember.join(organizationId, userId, invitation.getRoleKey()));
			memberPermissionCache.evict(organizationId, userId);
			events.publishEvent(new OrganizationMemberChanged(organizationId, userId, invitation.getInvitedBy(),
					Change.ADDED, invitation.getRoleKey().name()));
		}
		invitation.accept(userId, now);
		return new AcceptInvitationResponse(organizationId, organization.getName());
	}

	private OrganizationInvitation findByTokenOrThrow(String token) {
		return invitationRepository.findByTokenHash(hash(token))
			.orElseThrow(() -> new AppException(ErrorCode.ORGANIZATION_INVITATION_INVALID, "Unknown invitation"));
	}

	private void sendInvitationMail(OrganizationInvitation invitation, Organization organization, Long actorId,
			UserSummary invitee, String token) {
		Locale locale = SupportedLocales.fromTag(invitee == null ? null : invitee.locale());
		String inviterName = authFacade.findUser(actorId).map(UserSummary::fullName).orElse(organization.getName());
		String role = messageSource.getMessage("organization.role." + invitation.getRoleKey().name(), null,
				invitation.getRoleKey().name(), locale);
		String validity = messageSource.getMessage("mail.duration.days", new Object[] { VALIDITY.toDays() }, locale);
		Map<String, Object> variables = Map.of("inviterName", inviterName, "organizationName", organization.getName(),
				"role", role, "link", webApp.baseUrl() + "/invitations?token=" + token, "validity", validity);
		mailService.send(new MailMessage(invitation.getEmail(), locale, "organization-invitation", variables));
	}

	private static InvitationResponse toResponse(OrganizationInvitation invitation, Instant now) {
		return new InvitationResponse(invitation.getId(), invitation.getEmail(), invitation.getRoleKey(),
				invitation.statusAt(now), invitation.getExpiresAt(), invitation.getCreatedAt());
	}

	private static String generateToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static String hash(String token) {
		try {
			return HexFormat.of()
				.formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
