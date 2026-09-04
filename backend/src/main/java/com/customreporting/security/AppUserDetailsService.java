package com.customreporting.security;

import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

/**
 * Loads accounts for the authentication machinery, by email or by identifier.
 */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AppUserPrincipal loadUserByUsername(String email) {
        User user = userRepository.findByEmail(normalise(email))
                .orElseThrow(() -> new UsernameNotFoundException("No account found for the supplied email address."));
        return new AppUserPrincipal(user);
    }

    @Transactional(readOnly = true)
    public AppUserPrincipal loadUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("No account found for the supplied identifier."));
        return new AppUserPrincipal(user);
    }

    private String normalise(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
