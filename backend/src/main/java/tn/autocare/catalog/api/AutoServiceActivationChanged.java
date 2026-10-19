package tn.autocare.catalog.api;

/** An admin took a service out of the catalog ({@code active = false}) or put it back. */
public record AutoServiceActivationChanged(Long autoServiceId, boolean active, Long changedBy) {
}
