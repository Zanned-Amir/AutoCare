package tn.autocare.auth.controller;

import org.springframework.http.HttpHeaders;

import jakarta.servlet.http.HttpServletRequest;
import tn.autocare.auth.service.ClientInfo;

final class ClientInfoResolver {

	private ClientInfoResolver() {
	}

	/**
	 * Behind a reverse proxy, set server.forward-headers-strategy so getRemoteAddr() is
	 * the real client.
	 */
	static ClientInfo of(HttpServletRequest request) {
		return new ClientInfo(request.getHeader(HttpHeaders.USER_AGENT), request.getRemoteAddr());
	}

}
