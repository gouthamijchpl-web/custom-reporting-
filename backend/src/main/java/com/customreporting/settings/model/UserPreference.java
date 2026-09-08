package com.customreporting.settings.model;

import com.customreporting.common.AuditableEntity;
import com.customreporting.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.UUID;

@Entity
@Table(name = "application_user_preferences",
        uniqueConstraints = @UniqueConstraint(name = "ux_application_user_preferences_key", columnNames = {"user_id", "preference_key"}))
public class UserPreference extends AuditableEntity {
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(name = "preference_key", nullable = false, length = 100) private String key;
    @Column(name = "value_json", nullable = false, columnDefinition = "text") private String valueJson;

    protected UserPreference() {}
    public UserPreference(User user, String key, String valueJson) {
        this.user = user; this.key = key; this.valueJson = valueJson;
    }
    public String getKey() { return key; }
    public String getValueJson() { return valueJson; }
    public void setValueJson(String value) { valueJson = value; }
}
