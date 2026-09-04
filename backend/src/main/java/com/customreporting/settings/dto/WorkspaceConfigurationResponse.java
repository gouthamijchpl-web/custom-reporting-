package com.customreporting.settings.dto;

import com.customreporting.settings.model.WorkspaceConfiguration;
import java.time.Instant;
import java.util.UUID;

public record WorkspaceConfigurationResponse(UUID id, String name, String code, String description,
                                             boolean active, String defaultCurrency, String timeZone,
                                             Instant createdAt, Instant updatedAt) {
    public static WorkspaceConfigurationResponse from(WorkspaceConfiguration value) {
        return new WorkspaceConfigurationResponse(value.getId(), value.getName(), value.getCode(),
                value.getDescription(), value.isActive(), value.getDefaultCurrency(), value.getTimeZone(),
                value.getCreatedAt(), value.getUpdatedAt());
    }
}
