package com.customreporting.entity.dto;

import java.util.List;
import java.util.UUID;

/**
 * The entities available to the account, plus which one is currently active.
 *
 * <p>Returned as one payload so the switcher can render its list and its current value
 * from a single request.</p>
 *
 * @param entities         every entity owned by the account, ordered by name
 * @param selectedEntityId the active entity, or null when none is chosen yet
 */
public record EntityListResponse(List<EntityResponse> entities, UUID selectedEntityId) {
}
