package com.customreporting.auth.service;

import com.customreporting.auth.repository.RefreshTokenRepository;
import com.customreporting.config.SecurityProperties;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Security bookkeeping that must be recorded even though the surrounding request fails.
 *
 * <p>A rejected sign-in ends in an exception, which rolls the caller's transaction back.
 * Anything written on that path — the failed-attempt counter, a revocation triggered by a
 * suspected stolen token — would be undone along with it, quietly defeating the
 * protection. These operations therefore run in their own transaction
 * ({@link Propagation#REQUIRES_NEW}) and commit independently of the caller.</p>
 *
 * <p>This is a separate bean on purpose: Spring's transaction proxy is bypassed by
 * self-invocation, so a method on {@link AuthService} could not achieve the same thing.</p>
 */
@Service
public class AccountSecurityService {

    private static final Logger log = LoggerFactory.getLogger(AccountSecurityService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SecurityProperties securityProperties;

    public AccountSecurityService(UserRepository userRepository,
                                  RefreshTokenRepository refreshTokenRepository,
                                  SecurityProperties securityProperties) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.securityProperties = securityProperties;
    }

    /**
     * Counts one failed sign-in and locks the account once the threshold is reached.
     *
     * @param userId account that was targeted
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedLoginAttempt(UUID userId) {
        userRepository.findById(userId).ifPresent(user -> {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);

            SecurityProperties.Lockout lockout = securityProperties.lockout();
            if (attempts >= lockout.maxFailedAttempts()) {
                user.setLockedUntil(Instant.now().plus(lockout.lockDuration()));
                log.warn("Account {} locked after {} failed sign-in attempts", userId, attempts);
            }
            userRepository.save(user);
        });
    }

    /** Revokes every active session of an account, used when a token looks compromised. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllSessions(UUID userId) {
        userRepository.findById(userId).ifPresent(this::revokeAllSessions);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllSessions(User user) {
        int revoked = refreshTokenRepository.revokeAllForUser(user, Instant.now());
        if (revoked > 0) {
            log.info("Revoked {} active sessions for account {}", revoked, user.getId());
        }
    }
}
