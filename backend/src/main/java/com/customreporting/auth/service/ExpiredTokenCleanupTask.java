package com.customreporting.auth.service;

import com.customreporting.auth.repository.PasswordResetTokenRepository;
import com.customreporting.auth.repository.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Removes refresh and password reset tokens that can no longer be used, keeping the
 * session tables from growing without bound.
 *
 * <p>A grace period is kept before deletion so recent revocations remain visible for
 * troubleshooting.</p>
 */
@Component
public class ExpiredTokenCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(ExpiredTokenCleanupTask.class);
    private static final Duration RETENTION = Duration.ofDays(7);

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    public ExpiredTokenCleanupTask(RefreshTokenRepository refreshTokenRepository,
                                   PasswordResetTokenRepository passwordResetTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeExpiredTokens() {
        Instant cutoff = Instant.now().minus(RETENTION);
        int refreshTokens = refreshTokenRepository.deleteExpiredBefore(cutoff);
        int resetTokens = passwordResetTokenRepository.deleteExpiredBefore(cutoff);

        if (refreshTokens > 0 || resetTokens > 0) {
            log.info("Purged {} refresh tokens and {} password reset tokens older than {}",
                    refreshTokens, resetTokens, cutoff);
        }
    }
}
