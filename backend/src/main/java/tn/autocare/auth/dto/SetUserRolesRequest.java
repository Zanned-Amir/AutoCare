package tn.autocare.auth.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public record SetUserRolesRequest(@NotEmpty List<@NotBlank String> roles) {
}
