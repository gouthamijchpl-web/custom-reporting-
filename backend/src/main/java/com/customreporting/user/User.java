package com.customreporting.user;

import com.customreporting.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * An application account.
 *
 * <p>The email address is the login identifier and is always persisted in lower case so
 * that uniqueness is case insensitive. Only the BCrypt hash of the password is stored.</p>
 *
 * <p>Three separate ideas are tracked rather than one "is this account usable" flag,
 * because they are genuinely independent:</p>
 * <ul>
 *   <li><strong>Registration</strong> — {@link #hasPassword()}. An administrator can add
 *       someone to the team before they have ever set a password.</li>
 *   <li><strong>Access</strong> — {@link #getAccessStatus()}. Whether an administrator
 *       permits entry, which can be withdrawn without touching the password.</li>
 *   <li><strong>Removal</strong> — {@link #getDeletedAt()}. Removal is a soft delete, so
 *       work the person did remains attributable after their access ends.</li>
 * </ul>
 */
@Entity
@Table(
        name = "users",
        indexes = @Index(name = "ux_users_email", columnList = "email", unique = true)
)
public class User extends AuditableEntity {

    /**
     * Stored in {@code password_hash} for an invited account that has not registered.
     *
     * <p>A placeholder rather than {@code null} because the column is {@code NOT NULL} in
     * databases created before invitations existed. It can never match a BCrypt hash, and
     * {@link #hasPassword()} is checked before any comparison is attempted.</p>
     */
    private static final String NO_PASSWORD = "!invited";

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "email", nullable = false, length = 254, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash = NO_PASSWORD;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role = Role.USER;

    /**
     * Kept in step with {@link #accessStatus} by {@link #setAccessStatus}, which is the
     * only way to change either. Retained as its own column because databases created
     * before access statuses existed declare it {@code NOT NULL}.
     */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    /**
     * The default clause backfills accounts that predate this column, which would otherwise
     * fail the not-null constraint when the schema is updated in place.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "access_status", nullable = false, length = 20,
            columnDefinition = "varchar(20) default 'ACTIVE' not null")
    private AccessStatus accessStatus = AccessStatus.ACTIVE;

    /** Set when an administrator removes the member; the row itself is never deleted. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    /** Consecutive failed sign-in attempts; reset on every successful sign-in. */
    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts;

    /** When set and in the future, sign-in is temporarily blocked. */
    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    /** When the password last changed. Informational; the check uses the version below. */
    @Column(name = "credentials_changed_at", nullable = false)
    private Instant credentialsChangedAt = Instant.now();

    /**
     * Incremented whenever the password changes. Access tokens carry the value they were
     * minted with, and any token whose value no longer matches is refused.
     *
     * <p>An exact counter rather than a timestamp comparison: a JWT records its issue time
     * to the second, so a token minted in the same second as a password change could not be
     * distinguished from one minted just before it, and survived the change.</p>
     */
    @Column(name = "credentials_version", nullable = false,
            columnDefinition = "int default 0 not null")
    private int credentialsVersion;

    protected User() {
        // required by JPA
    }

    /** Creates a self-registered account, which arrives with a password already chosen. */
    public User(String fullName, String email, String passwordHash) {
        this.fullName = fullName;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    /**
     * Creates an account an administrator added on someone's behalf. It has no password
     * until that person registers.
     */
    public static User invited(String fullName, String email, Role role, AccessStatus accessStatus) {
        User user = new User();
        user.fullName = fullName;
        user.email = email;
        user.passwordHash = NO_PASSWORD;
        user.role = role;
        user.setAccessStatus(accessStatus);
        return user;
    }

    /** @return true once the person has chosen a password of their own */
    public boolean hasPassword() {
        return passwordHash != null && !NO_PASSWORD.equals(passwordHash);
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    /** @return true when this account may sign in and use the application right now */
    public boolean hasApplicationAccess() {
        return !isDeleted() && accessStatus.grantsAccess() && hasPassword();
    }

    public boolean isCurrentlyLocked() {
        return lockedUntil != null && lockedUntil.isAfter(Instant.now());
    }

    /** Marks the member as removed without discarding the record they are attached to. */
    public void markDeleted() {
        if (deletedAt == null) {
            deletedAt = Instant.now();
        }
        setAccessStatus(AccessStatus.INACTIVE);
    }

    /** Brings a previously removed member back, ready to be reconfigured by the caller. */
    public void restore() {
        deletedAt = null;
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public AccessStatus getAccessStatus() {
        return accessStatus;
    }

    /** The single mutator for access, so the legacy {@code enabled} flag cannot drift. */
    public void setAccessStatus(AccessStatus accessStatus) {
        this.accessStatus = accessStatus;
        this.enabled = accessStatus.grantsAccess();
    }

    public boolean isEnabled() {
        return enabled;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public void setFailedLoginAttempts(int failedLoginAttempts) {
        this.failedLoginAttempts = failedLoginAttempts;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public Instant getCredentialsChangedAt() {
        return credentialsChangedAt;
    }

    public int getCredentialsVersion() {
        return credentialsVersion;
    }

    /** Records a credential change, retiring every access token issued before now. */
    public void recordCredentialChange() {
        this.credentialsChangedAt = Instant.now();
        this.credentialsVersion++;
    }
}
