package com.customreporting.settings.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

public record UserPreferenceRequest(@NotNull JsonNode value) {
}
