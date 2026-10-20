package tn.autocare.organization.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Every photo id of the organization, in the new order (first = cover). */
public record ReorderFilesRequest(@NotNull @Size(max = 20) List<@NotNull Long> fileIds) {
}
