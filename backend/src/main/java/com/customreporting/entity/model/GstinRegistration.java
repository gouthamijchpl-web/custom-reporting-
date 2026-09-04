package com.customreporting.entity.model;

import com.customreporting.common.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "entity_gstins", indexes = @Index(name = "ix_gstin_entity", columnList = "entity_id"))
public class GstinRegistration extends AuditableEntity {
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "entity_id", nullable = false)
    private ReportingEntity reportingEntity;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "book_id") private EntityBook linkedBook;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "branch_id") private Branch linkedBranch;
    @Column(nullable = false, length = 15) private String gstin;
    @Column(name = "state_name", nullable = false, length = 80) private String stateName;
    @Enumerated(EnumType.STRING) @Column(name = "registration_type", nullable = false, length = 30)
    private RegistrationType registrationType;
    @Column(name = "gstn_username", length = 120) private String gstnUsername;
    @Column(name = "gstn_password_encrypted", length = 2048) private String gstnPasswordEncrypted;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "e_invoice_applicable", nullable = false) private boolean eInvoiceApplicable;
    @Column(name = "archived_at") private Instant archivedAt;

    protected GstinRegistration() {}
    public GstinRegistration(ReportingEntity entity, String gstin) { reportingEntity = entity; this.gstin = gstin; }
    public UUID getId() { return id; }
    public ReportingEntity getReportingEntity() { return reportingEntity; }
    public EntityBook getLinkedBook() { return linkedBook; }
    public void setLinkedBook(EntityBook value) { linkedBook = value; }
    public Branch getLinkedBranch() { return linkedBranch; }
    public void setLinkedBranch(Branch value) { linkedBranch = value; }
    public String getGstin() { return gstin; }
    public void setGstin(String value) { gstin = value; }
    public String getStateName() { return stateName; }
    public void setStateName(String value) { stateName = value; }
    public RegistrationType getRegistrationType() { return registrationType; }
    public void setRegistrationType(RegistrationType value) { registrationType = value; }
    public String getGstnUsername() { return gstnUsername; }
    public void setGstnUsername(String value) { gstnUsername = value; }
    public boolean hasGstnPassword() { return gstnPasswordEncrypted != null; }
    public void setGstnPasswordEncrypted(String value) { gstnPasswordEncrypted = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public boolean isEInvoiceApplicable() { return eInvoiceApplicable; }
    public void setEInvoiceApplicable(boolean value) { eInvoiceApplicable = value; }
    public void archive() { archivedAt = Instant.now(); active = false; }
}
