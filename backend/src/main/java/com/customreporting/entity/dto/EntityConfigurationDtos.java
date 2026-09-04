package com.customreporting.entity.dto;

import com.customreporting.entity.model.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

public final class EntityConfigurationDtos {
    private EntityConfigurationDtos() {}

    public record BranchRequest(
            @Size(max = 120) String name,
            @Size(max = 20) @Pattern(regexp = "^$|^[A-Za-z0-9-]+$") String code,
            boolean primaryBranch,
            boolean active) {}

    public record BranchResponse(UUID id, String name, String code, boolean primaryBranch,
                                 boolean active, Instant createdAt, Instant updatedAt) {
        public static BranchResponse from(Branch value) {
            return new BranchResponse(value.getId(), value.getName(), value.getCode(), value.isPrimaryBranch(),
                    value.isActive(), value.getCreatedAt(), value.getUpdatedAt());
        }
    }

    public record GstinRequest(
            @Pattern(regexp = "^$|^DRAFT-[A-Fa-f0-9]{8}$|^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]Z[0-9A-Za-z]$") String gstin,
            UUID linkedBookId,
            UUID linkedBranchId,
            @Size(max = 80) String stateName,
            RegistrationType registrationType,
            @Size(max = 120) String gstnUsername,
            @Size(max = 512) String gstnPassword,
            boolean active,
            boolean eInvoiceApplicable) {}

    public record GstinResponse(UUID id, String gstin, UUID linkedBookId, String linkedBookName,
                                UUID linkedBranchId, String linkedBranchName,
                                String stateName, RegistrationType registrationType, String gstnUsername,
                                boolean passwordConfigured, boolean active, boolean eInvoiceApplicable,
                                Instant createdAt, Instant updatedAt) {
        public static GstinResponse from(GstinRegistration value) {
            EntityBook book = value.getLinkedBook();
            Branch branch = value.getLinkedBranch();
            return new GstinResponse(value.getId(), value.getGstin(), book == null ? null : book.getId(),
                    book == null ? null : book.getName(), branch == null ? null : branch.getId(),
                    branch == null ? null : branch.getName(), value.getStateName(), value.getRegistrationType(),
                    value.getGstnUsername(), value.hasGstnPassword(), value.isActive(),
                    value.isEInvoiceApplicable(), value.getCreatedAt(), value.getUpdatedAt());
        }
    }

    public record BookRequest(
            @Size(max = 120) String name,
            BookSource source,
            boolean primaryBook,
            boolean active,
            @Size(max = 120) String tallyCompanyName,
            @Size(max = 255) String tallyHost,
            @Min(1) @Max(65535) Integer tallyPort,
            @Size(max = 255) String clientId,
            @Size(max = 512) String clientSecret,
            @Size(max = 255) String accountsDomain,
            @Size(max = 1024) String generatedCode,
            @Size(max = 255) String apiDomain,
            @Size(max = 100) String organizationId,
            @Size(max = 160) String organizationName,
            boolean generateAndStoreToken) {}

    public record BookResponse(UUID id, String name, BookSource source, boolean primaryBook,
                               boolean active, String tallyCompanyName, String tallyHost, Integer tallyPort,
                               String clientId, String accountsDomain, String apiDomain, String organizationId,
                               String organizationName, boolean secretConfigured, boolean tokenConnected,
                               Instant tokenExpiresAt, Instant createdAt, Instant updatedAt) {
        public static BookResponse from(EntityBook value) {
            return new BookResponse(value.getId(), value.getName(), value.getSource(), value.isPrimaryBook(),
                    value.isActive(), value.getTallyCompanyName(), value.getTallyHost(), value.getTallyPort(),
                    value.getZohoClientId(), value.getZohoAccountsDomain(), value.getZohoApiDomain(),
                    value.getZohoOrganizationId(), value.getZohoOrganizationName(),
                    value.hasZohoClientSecret(), value.hasZohoToken(), value.getZohoTokenExpiresAt(),
                    value.getCreatedAt(), value.getUpdatedAt());
        }
    }
}
