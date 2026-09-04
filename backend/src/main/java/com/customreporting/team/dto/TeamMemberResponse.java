package com.customreporting.team.dto;

import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import com.customreporting.user.User;

import java.time.Instant;
import java.util.UUID;

/**
 * A team member as the Teams screen sees them. Never exposes the password hash, lockout
 * counters or anything else internal to authentication.
 *
 * @param registered whether the person has set a password; a member added by an
 *                   administrator has not until they complete sign-up
 * @param self       true for the row belonging to the administrator making the request,
 *                   so the UI can disable the actions they are not allowed to take
 */
public record TeamMemberResponse(
        UUID id,
        String fullName,
        String email,
        Role role,
        AccessStatus accessStatus,
        boolean registered,
        boolean self,
        Instant addedOn,
        Instant lastLoginAt
) {

    public static TeamMemberResponse from(User user, UUID currentUserId) {
        return new TeamMemberResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getAccessStatus(),
                user.hasPassword(),
                user.getId().equals(currentUserId),
                user.getCreatedAt(),
                user.getLastLoginAt()
        );
    }
}
