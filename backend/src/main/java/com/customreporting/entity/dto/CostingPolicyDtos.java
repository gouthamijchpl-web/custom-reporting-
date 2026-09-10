package com.customreporting.entity.dto;

import com.customreporting.entity.model.EntityCostingPolicyRevision;
import com.customreporting.entity.model.InventoryCostingMethod;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class CostingPolicyDtos {
    private CostingPolicyDtos() {
    }

    public enum ApplicationMode {
        RECALCULATE_ALL,
        EFFECTIVE_DATE
    }

    public record CostingPolicyRequest(
            @NotNull InventoryCostingMethod method,
            @NotNull ApplicationMode applicationMode,
            LocalDate effectiveDate
    ) {
    }

    public record CostingPolicyRevisionResponse(
            UUID id,
            InventoryCostingMethod method,
            LocalDate effectiveFrom,
            Instant createdAt
    ) {
        public static CostingPolicyRevisionResponse from(EntityCostingPolicyRevision revision) {
            return new CostingPolicyRevisionResponse(revision.getId(), revision.getCostingMethod(),
                    revision.getEffectiveFrom(), revision.getCreatedAt());
        }
    }

    public record CostingPolicyResponse(
            UUID entityId,
            InventoryCostingMethod currentMethod,
            List<CostingPolicyRevisionResponse> revisions
    ) {
    }
}

