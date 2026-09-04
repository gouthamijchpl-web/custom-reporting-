package com.customreporting.entity.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * @param name        display name, unique within the account
 * @param code        optional short label, letters and digits only
 * @param description optional note about what this entity covers
 */
public record CreateEntityRequest(

        @Size(max = 120, message = "Entity name must be 120 characters or fewer.")
        String name,

        @Size(max = 12, message = "Code must be 12 characters or fewer.")
        @Pattern(regexp = "^$|^[A-Za-z0-9-]+$", message = "Code may only contain letters, numbers and hyphens.")
        String code,

        @Size(max = 500, message = "Description must be 500 characters or fewer.")
        String description,

        @Pattern(regexp = "^$|^[A-Za-z]{5}[0-9]{4}[A-Za-z]$", message = "Enter a valid PAN.")
        String pan,

        @Pattern(regexp = "^$|^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]Z[0-9A-Za-z]$", message = "Enter a valid GSTIN.")
        String primaryGstin,

        @Size(max = 120, message = "GSTIN username must be 120 characters or fewer.")
        String gstnUsername,

        @Size(max = 512, message = "GSTIN password must be 512 characters or fewer.")
        String gstnPassword,

        @Size(max = 120, message = "Tally company name must be 120 characters or fewer.")
        String tallyCompanyName,

        @Size(max = 255, message = "Tally host is too long.")
        String tallyHost,

        @jakarta.validation.constraints.Min(value = 1, message = "Tally port must be between 1 and 65535.")
        @jakarta.validation.constraints.Max(value = 65535, message = "Tally port must be between 1 and 65535.")
        Integer tallyPort,

        Boolean active,
        boolean multipleBranches,
        boolean eInvoiceEnabled,
        boolean eWayBillEnabled,
        boolean stockEnabled,
        boolean costCentreExtractionEnabled,
        UUID groupId,
        @Size(max = 120, message = "Primary branch name must be 120 characters or fewer.")
        String primaryBranchName
) {
}
