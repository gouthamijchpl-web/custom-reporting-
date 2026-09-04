package com.customreporting.settings.dto;

import jakarta.validation.constraints.*;

public record WorkspaceConfigurationRequest(
        @NotBlank @Size(min = 2, max = 120) String name,
        @NotBlank @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9-]+$") String code,
        @Size(max = 500) String description,
        boolean active,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String defaultCurrency,
        @NotBlank @Size(max = 80) String timeZone) {}
