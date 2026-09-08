package com.customreporting.modules.upload.model;

import com.customreporting.common.AuditableEntity;
import com.customreporting.entity.model.Branch;
import com.customreporting.entity.model.ReportingEntity;
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

@Entity
@Table(name = "uploaded_data_states",
        uniqueConstraints = @UniqueConstraint(name = "ux_uploaded_data_states_scope", columnNames = "scope_key"),
        indexes = @Index(name = "ix_uploaded_data_states_entity", columnList = "entity_id"))
public class UploadState extends AuditableEntity {

    @Id
    @GeneratedValue
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "scope_key", nullable = false, length = 100)
    private String scopeKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entity_id", nullable = false)
    private ReportingEntity reportingEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "updated_by", nullable = false)
    private User updatedBy;

    @Column(name = "payload_json", nullable = false, columnDefinition = "text")
    private String payloadJson;

    protected UploadState() {
    }

    public UploadState(String scopeKey, ReportingEntity reportingEntity, Branch branch,
                       User updatedBy, String payloadJson) {
        this.scopeKey = scopeKey;
        this.reportingEntity = reportingEntity;
        this.branch = branch;
        this.updatedBy = updatedBy;
        this.payloadJson = payloadJson;
    }

    public ReportingEntity getReportingEntity() { return reportingEntity; }
    public Branch getBranch() { return branch; }
    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String value) { payloadJson = value; }
    public void setUpdatedBy(User value) { updatedBy = value; }
}
