package com.customreporting.team.dto;

import com.customreporting.user.AccessStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Activates or deactivates a member without touching anything else about them.
 */
public record UpdateAccessStatusRequest(

        @NotNull(message = "Choose an access status.")
        AccessStatus accessStatus
) {
}
