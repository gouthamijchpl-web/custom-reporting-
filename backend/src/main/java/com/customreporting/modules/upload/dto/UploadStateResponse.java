package com.customreporting.modules.upload.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record UploadStateResponse(
        UUID entityId,
        UUID branchId,
        JsonNode uploadsByType,
        Instant updatedAt
) {
}
