package com.customreporting.entity.model;

import com.customreporting.businessgroup.model.BusinessGroup;
import com.customreporting.common.AuditableEntity;
import com.customreporting.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.UUID;
import java.time.Instant;

/**
 * A business the user reports on — a client, a company or a legal entity.
 *
 * <p>Named {@code ReportingEntity} rather than {@code Entity} so it is never confused with
 * the JPA annotation of that name.</p>
 *
 * <p>Each record belongs to the account that created it, and every query is scoped by
 * owner, so one user can never see or change another user's entities. When shared
 * workspaces arrive, the owner reference becomes the natural place to hang membership.</p>
 */
@Entity
@Table(
        name = "reporting_entities",
        uniqueConstraints = {
                @UniqueConstraint(name = "ux_reporting_entities_owner_name", columnNames = {"owner_id", "name"}),
                @UniqueConstraint(name = "ux_reporting_entities_owner_code", columnNames = {"owner_id", "code"})
        },
        indexes = {
                @Index(name = "ix_reporting_entities_owner", columnList = "owner_id"),
                @Index(name = "ix_reporting_entities_group", columnList = "group_id")
        }
)
public class ReportingEntity extends AuditableEntity {

    public static final int MAX_NAME_LENGTH = 120;
    public static final int MAX_CODE_LENGTH = 12;
    public static final int MAX_DESCRIPTION_LENGTH = 500;

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private BusinessGroup businessGroup;

    @Column(name = "name", nullable = false, length = MAX_NAME_LENGTH)
    private String name;

    /** Optional short label, shown where the full name will not fit. */
    @Column(name = "code", length = MAX_CODE_LENGTH)
    private String code;

    @Column(name = "description", length = MAX_DESCRIPTION_LENGTH)
    private String description;

    @Column(name = "pan", length = 10)
    private String pan;

    @Column(name = "primary_gstin", length = 15)
    private String primaryGstin;

    @Column(name = "gstn_username", length = 120)
    private String gstnUsername;

    @Column(name = "gstn_password_encrypted", length = 2048)
    private String gstnPasswordEncrypted;

    @Column(name = "tally_company_name", length = MAX_NAME_LENGTH)
    private String tallyCompanyName;

    @Column(name = "tally_host", nullable = false, length = 255,
            columnDefinition = "varchar(255) default 'localhost' not null")
    private String tallyHost = "localhost";

    @Column(name = "tally_port", nullable = false,
            columnDefinition = "integer default 9000 not null")
    private int tallyPort = 9000;

    @Column(name = "multiple_branches", nullable = false,
            columnDefinition = "boolean default false not null")
    private boolean multipleBranches;

    @Column(name = "e_invoice_enabled", nullable = false,
            columnDefinition = "boolean default false not null")
    private boolean eInvoiceEnabled;

    @Column(name = "e_way_bill_enabled", nullable = false,
            columnDefinition = "boolean default false not null")
    private boolean eWayBillEnabled;

    @Column(name = "stock_enabled", nullable = false,
            columnDefinition = "boolean default false not null")
    private boolean stockEnabled;

    @Column(name = "cost_centre_extraction_enabled", nullable = false,
            columnDefinition = "boolean default false not null")
    private boolean costCentreExtractionEnabled;

    /**
     * Inactive entities stay in the record for historical reports but are not offered
     * when choosing which entity to work on.
     */
    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "archived_at")
    private Instant archivedAt;

    protected ReportingEntity() {
        // required by JPA
    }

    public ReportingEntity(User owner, String name, String code, String description) {
        this.owner = owner;
        this.name = name;
        this.code = code;
        this.description = description;
    }

    public UUID getId() {
        return id;
    }

    public User getOwner() {
        return owner;
    }

    public BusinessGroup getBusinessGroup() { return businessGroup; }
    public void setBusinessGroup(BusinessGroup value) { businessGroup = value; }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getPan() { return pan; }
    public void setPan(String pan) { this.pan = pan; }
    public String getPrimaryGstin() { return primaryGstin; }
    public void setPrimaryGstin(String primaryGstin) { this.primaryGstin = primaryGstin; }
    public String getGstnUsername() { return gstnUsername; }
    public void setGstnUsername(String gstnUsername) { this.gstnUsername = gstnUsername; }
    public boolean hasGstnPassword() { return gstnPasswordEncrypted != null; }
    public void setGstnPasswordEncrypted(String value) { this.gstnPasswordEncrypted = value; }
    public String getTallyCompanyName() { return tallyCompanyName; }
    public void setTallyCompanyName(String tallyCompanyName) { this.tallyCompanyName = tallyCompanyName; }
    public String getTallyHost() { return tallyHost; }
    public void setTallyHost(String tallyHost) { this.tallyHost = tallyHost; }
    public int getTallyPort() { return tallyPort; }
    public void setTallyPort(int tallyPort) { this.tallyPort = tallyPort; }
    public boolean isMultipleBranches() { return multipleBranches; }
    public void setMultipleBranches(boolean multipleBranches) { this.multipleBranches = multipleBranches; }
    public boolean isEInvoiceEnabled() { return eInvoiceEnabled; }
    public void setEInvoiceEnabled(boolean eInvoiceEnabled) { this.eInvoiceEnabled = eInvoiceEnabled; }
    public boolean isEWayBillEnabled() { return eWayBillEnabled; }
    public void setEWayBillEnabled(boolean eWayBillEnabled) { this.eWayBillEnabled = eWayBillEnabled; }
    public boolean isStockEnabled() { return stockEnabled; }
    public void setStockEnabled(boolean stockEnabled) { this.stockEnabled = stockEnabled; }
    public boolean isCostCentreExtractionEnabled() { return costCentreExtractionEnabled; }
    public void setCostCentreExtractionEnabled(boolean value) { this.costCentreExtractionEnabled = value; }
    public Instant getArchivedAt() { return archivedAt; }
    public void archive() { this.archivedAt = Instant.now(); this.active = false; }
}
