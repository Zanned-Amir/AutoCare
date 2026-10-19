package tn.autocare.apiaccess.dto;

import java.time.LocalDate;

public record ApiKeyUsageResponse(LocalDate day, long requests, long rejected) {
}
