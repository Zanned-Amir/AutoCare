package tn.autocare.servicerequest.dto;

import java.util.Map;

import tn.autocare.servicerequest.api.RequestStatus;

/** Platform-wide figures for the admin dashboard; "today" is the Tunis calendar day. */
public record ServiceRequestStatsResponse(long total, long createdToday, Map<RequestStatus, Long> byStatus) {
}
