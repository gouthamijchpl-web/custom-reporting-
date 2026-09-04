package com.customreporting.user;

/**
 * Coarse grained application roles. Spring Security authorities are derived by
 * prefixing the name with {@code ROLE_}.
 */
public enum Role {

    /** Standard authenticated member of the reporting workspace. */
    USER,

    /** May manage application settings and team members. */
    ADMIN,

    /** Workspace owner with full administrative access. */
    OWNER;

    public String authority() {
        return "ROLE_" + name();
    }

    public boolean isAdministrator() {
        return this == ADMIN || this == OWNER;
    }
}
