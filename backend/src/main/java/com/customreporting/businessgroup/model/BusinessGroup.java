package com.customreporting.businessgroup.model;

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

@Entity
@Table(
        name = "business_groups",
        uniqueConstraints = {
                @UniqueConstraint(name = "ux_business_groups_name", columnNames = "name"),
                @UniqueConstraint(name = "ux_business_groups_series_code", columnNames = "series_code")
        },
        indexes = @Index(name = "ix_business_groups_owner", columnList = "owner_id")
)
public class BusinessGroup extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "series_code", nullable = false, length = 12)
    private String seriesCode;

    @Column(nullable = false)
    private boolean active = true;

    protected BusinessGroup() {}

    public BusinessGroup(User owner, String name, String seriesCode, boolean active) {
        this.owner = owner;
        this.name = name;
        this.seriesCode = seriesCode;
        this.active = active;
    }

    public UUID getId() { return id; }
    public User getOwner() { return owner; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getSeriesCode() { return seriesCode; }
    public void setSeriesCode(String value) { seriesCode = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
}
