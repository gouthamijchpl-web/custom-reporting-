package com.customreporting.auth.dto;

import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import com.customreporting.user.User;

import java.time.Instant;
import java.util.UUID;

/**
 * The public projection of an account. Never exposes the password hash or lockout state.
 *
 * <p>The role and access status are included because the interface needs them: the role
 * decides whether the Teams screen is offered at all, and the status lets sign-up explain
 * that a new account is waiting for approval rather than ready to use.</p>
 */
public record UserResponse(
        UUID id,
        String fullName,
        String email,
        Role role,
        AccessStatus accessStatus,
        Instant createdAt,
        Instant lastLoginAt
) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getAccessStatus(),
                user.getCreatedAt(),
                user.getLastLoginAt()
        );
    }
}
