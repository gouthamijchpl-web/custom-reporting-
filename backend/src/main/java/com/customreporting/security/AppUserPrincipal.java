package com.customreporting.security;

import com.customreporting.user.User;
import com.customreporting.user.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Adapter exposing the application {@link User} to Spring Security while keeping the
 * identifiers the rest of the code needs (id, display name) close at hand.
 */
public class AppUserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String fullName;
    private final String passwordHash;
    private final boolean enabled;
    private final boolean accountNonLocked;
    private final int credentialsVersion;
    private final List<GrantedAuthority> authorities;

    public AppUserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.passwordHash = user.getPasswordHash();
        // Reflects removal and access status too, so revoking access invalidates live tokens
        // on the very next request instead of when they happen to expire.
        this.enabled = user.hasApplicationAccess();
        this.accountNonLocked = !user.isCurrentlyLocked();
        this.credentialsVersion = user.getCredentialsVersion();
        this.authorities = user.getRole() == Role.OWNER
                ? List.of(
                        new SimpleGrantedAuthority(user.getRole().authority()),
                        new SimpleGrantedAuthority(Role.ADMIN.authority()))
                : List.of(new SimpleGrantedAuthority(user.getRole().authority()));
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public int getCredentialsVersion() {
        return credentialsVersion;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
