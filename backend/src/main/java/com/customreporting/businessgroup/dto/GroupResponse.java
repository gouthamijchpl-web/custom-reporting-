package com.customreporting.businessgroup.dto;

import com.customreporting.businessgroup.model.BusinessGroup;

import java.time.Instant;
import java.util.UUID;

public record GroupResponse(
        UUID id,
        String name,
        String seriesCode,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
    public static GroupResponse from(BusinessGroup group) {
        return new GroupResponse(group.getId(), group.getName(), group.getSeriesCode(), group.isActive(),
                group.getCreatedAt(), group.getUpdatedAt());
    }
}
