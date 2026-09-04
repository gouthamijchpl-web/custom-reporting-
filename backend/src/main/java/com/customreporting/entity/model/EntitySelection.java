package com.customreporting.entity.model;

import com.customreporting.common.AuditableEntity;
import com.customreporting.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Which entity an account is currently working on.
 *
 * <p>Kept in its own table rather than on {@code UserPreferences} so the settings module
 * stays about interface preferences and does not have to know this module exists. The
 * selection survives sign-out, so a user returns to the entity they left off on.</p>
 */
@Entity
@Table(name = "entity_selections")
public class EntitySelection extends AuditableEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Null when the account has no entities yet, or the selected one was deleted. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_entity_id")
    private ReportingEntity selectedEntity;

    protected EntitySelection() {
        // required by JPA
    }

    public EntitySelection(User user) {
        this.user = user;
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public ReportingEntity getSelectedEntity() {
        return selectedEntity;
    }

    public void setSelectedEntity(ReportingEntity selectedEntity) {
        this.selectedEntity = selectedEntity;
    }
}
