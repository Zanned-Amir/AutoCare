package tn.autocare.diagnostic.dto;

public record SymptomResponse(Long id, String label, String description, int position, boolean active) {
}
