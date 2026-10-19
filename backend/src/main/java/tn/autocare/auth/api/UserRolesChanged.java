package tn.autocare.auth.api;

import java.util.List;

public record UserRolesChanged(Long userId, Long changedBy, List<String> roles) {
}
