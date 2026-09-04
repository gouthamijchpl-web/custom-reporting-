package com.customreporting.entity.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Full replacement of an entity's editable fields.
 *
 * @param active whether the entity is still offered when choosing one to work on
 */
public record UpdateEntityRequest(

        @Size(max = 120, message = "Entity name must be 120 characters or fewer.")
        String name,

        @Size(max = 12, message = "Code must be 12 characters or fewer.")
        @Pattern(regexp = "^$|^[A-Za-z0-9-]+$", message = "Code may only contain letters, numbers and hyphens.")
        String code,

        @Size(max = 500, message = "Description must be 500 characters or fewer.")
        String description,
        @Pattern(regexp = "^$|^[A-Za-z]{5}[0-9]{4}[A-Za-z]$", message = "Enter a valid PAN.") String pan,
        @Pattern(regexp = "^$|^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]Z[0-9A-Za-z]$", message = "Enter a valid GSTIN.") String primaryGstin,
        @Size(max = 120, message = "GSTIN username must be 120 characters or fewer.") String gstnUsername,
        @Size(max = 512, message = "GSTIN password must be 512 characters or fewer.") String gstnPassword,
        @Size(max = 120) String tallyCompanyName,
        @Size(max = 255) String tallyHost,
        @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(65535) Integer tallyPort,
        Boolean active,
        boolean multipleBranches,
        boolean eInvoiceEnabled,
        boolean eWayBillEnabled,
        boolean stockEnabled,
        boolean costCentreExtractionEnabled,
        UUID groupId
) {
}
