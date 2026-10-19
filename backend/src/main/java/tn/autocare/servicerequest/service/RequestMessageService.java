package tn.autocare.servicerequest.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.servicerequest.api.MessageSide;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.api.ServiceRequestMessagePosted;
import tn.autocare.servicerequest.dto.RequestMessageResponse;
import tn.autocare.servicerequest.entity.RequestMessage;
import tn.autocare.servicerequest.entity.ServiceRequest;
import tn.autocare.servicerequest.repository.RequestMessageRepository;
import tn.autocare.servicerequest.repository.ServiceRequestRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/** Chat on a request between its client and the members of the garage. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RequestMessageService {

	private static final int PREVIEW_LENGTH = 120;

	private final ServiceRequestRepository requestRepository;

	private final RequestMessageRepository messageRepository;

	private final AuthFacade authFacade;

	private final ApplicationEventPublisher events;

	public List<RequestMessageResponse> listMyRequestMessages(Long userId, Long requestId) {
		ServiceRequest request = findMine(userId, requestId);
		return toResponses(messageRepository.findAllByServiceRequestIdOrderByIdAsc(request.getId()), MessageSide.CLIENT,
				userId);
	}

	@Transactional
	public RequestMessageResponse postMyRequestMessage(Long userId, Long requestId, String body) {
		return post(findMine(userId, requestId), userId, MessageSide.CLIENT, body);
	}

	public List<RequestMessageResponse> listOrganizationRequestMessages(Long organizationId, Long requestId,
			Long memberId) {
		ServiceRequest request = findInOrganization(organizationId, requestId);
		return toResponses(messageRepository.findAllByServiceRequestIdOrderByIdAsc(request.getId()),
				MessageSide.PROVIDER, memberId);
	}

	@Transactional
	public RequestMessageResponse postOrganizationRequestMessage(Long organizationId, Long requestId, Long memberId,
			String body) {
		return post(findInOrganization(organizationId, requestId), memberId, MessageSide.PROVIDER, body);
	}

	private RequestMessageResponse post(ServiceRequest request, Long authorId, MessageSide side, String body) {
		// A refused or cancelled request has nothing left to discuss.
		if (request.getStatus() == RequestStatus.REJECTED || request.getStatus() == RequestStatus.CANCELLED) {
			throw new AppException(ErrorCode.SERVICE_REQUEST_CHAT_CLOSED, "The request is closed");
		}
		RequestMessage message = messageRepository.save(RequestMessage.post(request.getId(), authorId, side, body));
		String text = message.getBody();
		String preview = text.length() > PREVIEW_LENGTH ? text.substring(0, PREVIEW_LENGTH) + "…" : text;
		events.publishEvent(new ServiceRequestMessagePosted(request.getId(), request.getOrganizationId(),
				request.getUserId(), authorId, side, preview));
		return toResponses(List.of(message), side, authorId).getFirst();
	}

	private List<RequestMessageResponse> toResponses(List<RequestMessage> messages, MessageSide reader, Long readerId) {
		Map<Long, String> names = authFacade
			.listUsers(messages.stream().map(RequestMessage::getAuthorId).distinct().toList())
			.stream()
			.collect(Collectors.toMap(UserSummary::id, user -> user.fullName() == null ? "" : user.fullName(),
					(first, second) -> first));
		return messages.stream().map(message -> {
			boolean hidden = reader == MessageSide.CLIENT && message.getAuthorSide() == MessageSide.PROVIDER;
			boolean mine = message.getAuthorSide() == reader && message.getAuthorId().equals(readerId);
			return new RequestMessageResponse(message.getId(), message.getAuthorSide(), mine,
					hidden ? null : names.get(message.getAuthorId()), message.getBody(), message.getCreatedAt());
		}).toList();
	}

	private ServiceRequest findMine(Long userId, Long requestId) {
		return requestRepository.findByIdAndUserId(requestId, userId)
			.orElseThrow(() -> AppException.notFound("ServiceRequest", requestId));
	}

	private ServiceRequest findInOrganization(Long organizationId, Long requestId) {
		return requestRepository.findByIdAndOrganizationId(requestId, organizationId)
			.orElseThrow(() -> AppException.notFound("ServiceRequest", requestId));
	}

}
