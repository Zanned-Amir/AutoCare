package tn.autocare.catalog.api;

/** {@code icon}: key of the icon the apps show ("droplet"), empty for the default one. */
public record AutoServiceDto(Long id, String name, String description, boolean active, String icon) {
}
