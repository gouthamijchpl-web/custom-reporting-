package com.customreporting.entity.dto;

import com.customreporting.entity.model.ReportingEntity;

import java.time.Instant;
import java.util.UUID;

/**
 * A single entity as the client sees it.
 */
public record EntityResponse(
        UUID id,
        String name,
        String code,
        String description,
        UUID groupId,
        String groupName,
        String pan,
        String primaryGstin,
        String gstnUsername,
        boolean gstnPasswordConfigured,
        String tallyCompanyName,
        String tallyHost,
        int tallyPort,
        boolean multipleBranches,
        boolean eInvoiceEnabled,
        boolean eWayBillEnabled,
        boolean stockEnabled,
        boolean costCentreExtractionEnabled,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    public static EntityResponse from(ReportingEntity entity) {
        return new EntityResponse(
                entity.getId(),
                entity.getName(),
                entity.getCode(),
                entity.getDescription(),
                entity.getBusinessGroup() == null ? null : entity.getBusinessGroup().getId(),
                entity.getBusinessGroup() == null ? null : entity.getBusinessGroup().getName(),
                entity.getPan(),
                entity.getPrimaryGstin(),
                entity.getGstnUsername(),
                entity.hasGstnPassword(),
                entity.getTallyCompanyName(),
                entity.getTallyHost(),
                entity.getTallyPort(),
                entity.isMultipleBranches(),
                entity.isEInvoiceEnabled(),
                entity.isEWayBillEnabled(),
                entity.isStockEnabled(),
                entity.isCostCentreExtractionEnabled(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
