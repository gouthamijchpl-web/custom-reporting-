package com.customreporting.auth.service;

import com.customreporting.config.SecurityProperties;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetRateLimiterTest {

    @Test
    void rejectedRetriesDoNotExtendTheCooldownOrConsumeAnAttempt() {
        SecurityProperties settings = new SecurityProperties(null, null, null,
                new SecurityProperties.PasswordReset(2, Duration.ofMinutes(15), Duration.ofSeconds(10)), false);
        PasswordResetRateLimiter limiter = new PasswordResetRateLimiter(settings);
        Instant start = Instant.parse("2026-01-01T00:00:00Z");

        assertThat(limiter.tryAcquire("account", start)).isTrue();
        assertThat(limiter.tryAcquire("account", start.plusSeconds(5))).isFalse();
        assertThat(limiter.tryAcquire("account", start.plusSeconds(9))).isFalse();
        assertThat(limiter.tryAcquire("account", start.plusSeconds(10))).isTrue();
        assertThat(limiter.tryAcquire("account", start.plusSeconds(20))).isFalse();
        assertThat(limiter.tryAcquire("account", start.plus(Duration.ofMinutes(15)))).isTrue();
    }
}
