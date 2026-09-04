package com.customreporting.entity.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * @param entityId the entity to make active; must belong to the signed-in account
 */
public record SelectEntityRequest(

        @NotNull(message = "Choose an entity.")
        UUID entityId
) {
}
