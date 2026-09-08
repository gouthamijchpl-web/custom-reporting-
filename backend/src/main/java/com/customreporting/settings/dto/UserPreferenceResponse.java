package com.customreporting.settings.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

public record UserPreferenceResponse(String key, JsonNode value, Instant updatedAt) {
}
