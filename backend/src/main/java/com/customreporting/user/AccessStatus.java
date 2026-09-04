package com.customreporting.user;

/**
 * Whether an account may actually use the application.
 *
 * <p>Deliberately separate from the existence of the account itself: registering creates a
 * record, but it is an administrator granting {@link #ACTIVE} status that grants entry.</p>
 */
public enum AccessStatus {

    /** Registered, approved, and able to sign in. */
    ACTIVE,

    /** The account exists but entry is withheld; the password still works, access does not. */
    INACTIVE,

    /**
     * Invited or self-registered but not yet cleared for entry — either the person has not
     * finished registering, or an administrator has not approved them.
     */
    PENDING;

    public boolean grantsAccess() {
        return this == ACTIVE;
    }
}
