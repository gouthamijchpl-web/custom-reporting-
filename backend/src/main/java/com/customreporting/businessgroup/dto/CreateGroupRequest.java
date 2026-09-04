package com.customreporting.businessgroup.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateGroupRequest(
        @Size(max = 120, message = "Group name must be 120 characters or fewer.")
        String name,

        @Size(max = 12, message = "Series code must be 12 characters or fewer.")
        @Pattern(regexp = "^$|^[A-Za-z0-9-]+$", message = "Series code may only contain letters, numbers and hyphens.")
        String seriesCode,

        Boolean active
) {}
