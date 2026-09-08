package com.customreporting.modules.upload.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UploadStateRequest(
        @NotNull UUID entityId,
        UUID branchId,
        @NotNull JsonNode uploadsByType
) {
}
