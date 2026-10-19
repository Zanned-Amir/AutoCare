package tn.autocare.auth.service;

import java.util.List;

import tn.autocare.auth.entity.User;

/**
 * A user with the role names and merged permissions of their platform roles.
 * {@code backoffice}: at least one role allows backoffice sessions.
 */
record UserAccess(User user, List<String> roles, List<String> permissions, boolean backoffice) {
}
