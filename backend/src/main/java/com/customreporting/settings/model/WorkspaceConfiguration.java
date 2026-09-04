package com.customreporting.settings.model;

import com.customreporting.common.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "workspace_configuration")
public class WorkspaceConfiguration extends AuditableEntity {
    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, unique = true, length = 20) private String code;
    @Column(length = 500) private String description;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "default_currency", nullable = false, length = 3) private String defaultCurrency = "INR";
    @Column(name = "time_zone", nullable = false, length = 80) private String timeZone = "Asia/Kolkata";

    protected WorkspaceConfiguration() {}
    public WorkspaceConfiguration(String name, String code) { this.name = name; this.code = code; }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getCode() { return code; }
    public void setCode(String value) { code = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public String getDefaultCurrency() { return defaultCurrency; }
    public void setDefaultCurrency(String value) { defaultCurrency = value; }
    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String value) { timeZone = value; }
}
