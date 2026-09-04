package com.customreporting.team.dto;

import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Adds someone to the team. No password is set here: the person chooses their own when
 * they register with this address.
 */
public record CreateTeamMemberRequest(

        @NotBlank(message = "Full name is required.")
        @Size(min = 2, max = 120, message = "Full name must be between 2 and 120 characters.")
        String fullName,

        @NotBlank(message = "Email address is required.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 254, message = "Email address is too long.")
        String email,

        @NotNull(message = "Choose a role.")
        Role role,

        @NotNull(message = "Choose an access status.")
        AccessStatus accessStatus
) {
}
