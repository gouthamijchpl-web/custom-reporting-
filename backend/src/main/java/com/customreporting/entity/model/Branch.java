package com.customreporting.entity.model;

import com.customreporting.common.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "entity_branches",
        uniqueConstraints = @UniqueConstraint(name = "ux_branch_entity_code", columnNames = {"entity_id", "code"}),
        indexes = @Index(name = "ix_branch_entity", columnList = "entity_id"))
public class Branch extends AuditableEntity {
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "entity_id", nullable = false)
    private ReportingEntity reportingEntity;
    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, length = 20) private String code;
    @Column(name = "primary_branch", nullable = false) private boolean primaryBranch;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "archived_at") private Instant archivedAt;

    protected Branch() {}
    public Branch(ReportingEntity entity, String name, String code) {
        this.reportingEntity = entity; this.name = name; this.code = code;
    }
    public UUID getId() { return id; }
    public ReportingEntity getReportingEntity() { return reportingEntity; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getCode() { return code; }
    public void setCode(String value) { code = value; }
    public boolean isPrimaryBranch() { return primaryBranch; }
    public void setPrimaryBranch(boolean value) { primaryBranch = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public void archive() { archivedAt = Instant.now(); active = false; primaryBranch = false; }
}
