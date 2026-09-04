package com.customreporting.team.dto;

import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Updates an existing member.
 *
 * <p>The email address is intentionally absent. It is the login identifier, so changing it
 * silently would move someone's ability to sign in without their knowledge; a member
 * changes their own address from Settings, where they must already be signed in.</p>
 */
public record UpdateTeamMemberRequest(

        @NotBlank(message = "Full name is required.")
        @Size(min = 2, max = 120, message = "Full name must be between 2 and 120 characters.")
        String fullName,

        @NotNull(message = "Choose a role.")
        Role role,

        @NotNull(message = "Choose an access status.")
        AccessStatus accessStatus
) {
}
