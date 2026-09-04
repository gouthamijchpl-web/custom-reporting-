package com.customreporting.entity.model;

import com.customreporting.common.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "entity_books", indexes = @Index(name = "ix_book_entity", columnList = "entity_id"))
public class EntityBook extends AuditableEntity {
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "entity_id", nullable = false)
    private ReportingEntity reportingEntity;
    @Column(nullable = false, length = 120) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private BookSource source;
    @Column(name = "primary_book", nullable = false) private boolean primaryBook;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "tally_company_name", length = 120) private String tallyCompanyName;
    @Column(name = "tally_host", length = 255) private String tallyHost;
    @Column(name = "tally_port") private Integer tallyPort;
    @Column(name = "zoho_client_id", length = 255) private String zohoClientId;
    @Column(name = "zoho_client_secret_encrypted", length = 2048) private String zohoClientSecretEncrypted;
    @Column(name = "zoho_accounts_domain", length = 255) private String zohoAccountsDomain;
    @Column(name = "zoho_api_domain", length = 255) private String zohoApiDomain;
    @Column(name = "zoho_organization_id", length = 100) private String zohoOrganizationId;
    @Column(name = "zoho_organization_name", length = 160) private String zohoOrganizationName;
    @Column(name = "zoho_access_token_encrypted", length = 4096) private String zohoAccessTokenEncrypted;
    @Column(name = "zoho_refresh_token_encrypted", length = 4096) private String zohoRefreshTokenEncrypted;
    @Column(name = "zoho_token_expires_at") private Instant zohoTokenExpiresAt;
    @Column(name = "archived_at") private Instant archivedAt;

    protected EntityBook() {}
    public EntityBook(ReportingEntity entity, String name, BookSource source) {
        reportingEntity = entity; this.name = name; this.source = source;
    }
    public UUID getId() { return id; }
    public ReportingEntity getReportingEntity() { return reportingEntity; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public BookSource getSource() { return source; }
    public void setSource(BookSource value) { source = value; }
    public boolean isPrimaryBook() { return primaryBook; }
    public void setPrimaryBook(boolean value) { primaryBook = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public String getTallyCompanyName() { return tallyCompanyName; }
    public void setTallyCompanyName(String value) { tallyCompanyName = value; }
    public String getTallyHost() { return tallyHost; }
    public void setTallyHost(String value) { tallyHost = value; }
    public Integer getTallyPort() { return tallyPort; }
    public void setTallyPort(Integer value) { tallyPort = value; }
    public String getZohoClientId() { return zohoClientId; }
    public void setZohoClientId(String value) { zohoClientId = value; }
    public void setZohoClientSecretEncrypted(String value) { zohoClientSecretEncrypted = value; }
    public boolean hasZohoClientSecret() { return zohoClientSecretEncrypted != null; }
    public String getZohoAccountsDomain() { return zohoAccountsDomain; }
    public void setZohoAccountsDomain(String value) { zohoAccountsDomain = value; }
    public String getZohoApiDomain() { return zohoApiDomain; }
    public void setZohoApiDomain(String value) { zohoApiDomain = value; }
    public String getZohoOrganizationId() { return zohoOrganizationId; }
    public void setZohoOrganizationId(String value) { zohoOrganizationId = value; }
    public String getZohoOrganizationName() { return zohoOrganizationName; }
    public void setZohoOrganizationName(String value) { zohoOrganizationName = value; }
    public void setZohoAccessTokenEncrypted(String value) { zohoAccessTokenEncrypted = value; }
    public void setZohoRefreshTokenEncrypted(String value) { zohoRefreshTokenEncrypted = value; }
    public Instant getZohoTokenExpiresAt() { return zohoTokenExpiresAt; }
    public void setZohoTokenExpiresAt(Instant value) { zohoTokenExpiresAt = value; }
    public boolean hasZohoToken() { return zohoAccessTokenEncrypted != null; }
    public void archive() { archivedAt = Instant.now(); active = false; primaryBook = false; }
}
