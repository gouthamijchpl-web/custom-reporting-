package com.customreporting.entity.model;

import com.customreporting.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "entity_costing_policy_revisions", indexes =
        @Index(name = "ix_costing_policy_entity_effective", columnList = "entity_id,effective_from"))
public class EntityCostingPolicyRevision extends AuditableEntity {

    @Id
    @GeneratedValue
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entity_id", nullable = false)
    private ReportingEntity reportingEntity;

    @Enumerated(EnumType.STRING)
    @Column(name = "costing_method", nullable = false, length = 32)
    private InventoryCostingMethod costingMethod;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    protected EntityCostingPolicyRevision() {
    }

    public EntityCostingPolicyRevision(ReportingEntity reportingEntity,
                                       InventoryCostingMethod costingMethod,
                                       LocalDate effectiveFrom) {
        this.reportingEntity = reportingEntity;
        this.costingMethod = costingMethod;
        this.effectiveFrom = effectiveFrom;
    }

    public UUID getId() { return id; }
    public ReportingEntity getReportingEntity() { return reportingEntity; }
    public InventoryCostingMethod getCostingMethod() { return costingMethod; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
}

