package tn.autocare.apiaccess.security;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.context.MessageSource;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.LocaleResolver;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import tn.autocare.apiaccess.service.ApiKeyUsageRecorder;
import tn.autocare.shared.exception.ErrorCode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Authenticates /external/** with the X-Api-Key header (or "Authorization: ApiKey
 * &lt;key&gt;"), meters every call, and answers refusals as problem details like the rest
 * of the API.
 */
@RequiredArgsConstructor
class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

	private final ApiKeyAuthenticator authenticator;

	private final ApiKeyUsageRecorder usageRecorder;

	private final MessageSource messageSource;

	private final LocaleResolver localeResolver;

	private final JsonMapper jsonMapper;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		ApiKeyPrincipal principal;
		try {
			principal = authenticator.authenticate(presentedKey(request), request.getRemoteAddr());
		}
		catch (ApiKeyRejectedException rejected) {
			if (rejected.apiKeyId() != null) {
				usageRecorder.recordApiKeyCall(rejected.apiKeyId(), request.getRemoteAddr(), false);
			}
			writeProblem(request, response, rejected);
			return;
		}
		SecurityContextHolder.getContext().setAuthentication(new ApiKeyAuthenticationToken(principal));
		try {
			chain.doFilter(request, response);
		}
		finally {
			usageRecorder.recordApiKeyCall(principal.id(), request.getRemoteAddr(), response.getStatus() < 400);
			SecurityContextHolder.clearContext();
		}
	}

	private static String presentedKey(HttpServletRequest request) {
		String header = request.getHeader("X-Api-Key");
		if (header != null) {
			return header;
		}
		String authorization = request.getHeader("Authorization");
		return authorization != null && authorization.startsWith("ApiKey ") ? authorization.substring(7) : null;
	}

	private void writeProblem(HttpServletRequest request, HttpServletResponse response, ApiKeyRejectedException ex)
			throws IOException {
		ErrorCode code = ex.code();
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("type", "about:blank");
		body.put("title", code.status().getReasonPhrase());
		body.put("status", code.status().value());
		body.put("detail", messageSource.getMessage("error." + code.name(), null, code.name(),
				localeResolver.resolveLocale(request)));
		body.put("instance", request.getRequestURI());
		body.put("code", code.name());
		if (ex.retryAfterSeconds() > 0) {
			body.put("retryAfter", ex.retryAfterSeconds());
			response.setHeader("Retry-After", String.valueOf(ex.retryAfterSeconds()));
		}
		response.setStatus(code.status().value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write(jsonMapper.writeValueAsString(body));
	}

}
