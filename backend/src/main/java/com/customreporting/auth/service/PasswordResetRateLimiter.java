package com.customreporting.auth.service;

import com.customreporting.config.SecurityProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Small bounded rate limiter for unauthenticated in-application password changes.
 * Keys are SHA-256 email hashes supplied by {@link AuthService}, never raw addresses.
 */
@Component
public class PasswordResetRateLimiter {

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final int maxAttempts;
    private final Duration attemptWindow;
    private final Duration cooldown;
    private final Map<String, AttemptBucket> buckets = new HashMap<>();

    public PasswordResetRateLimiter(SecurityProperties securityProperties) {
        SecurityProperties.PasswordReset properties = securityProperties.passwordReset();
        this.maxAttempts = properties.maxAttempts();
        this.attemptWindow = properties.attemptWindow();
        this.cooldown = properties.cooldown();
    }

    public synchronized boolean tryAcquire(String key) {
        Instant now = Instant.now();
        AttemptBucket current = buckets.get(key);

        if (current == null || !now.isBefore(current.windowStartedAt().plus(attemptWindow))) {
            removeExpired(now);
            if (current == null && buckets.size() >= MAX_TRACKED_KEYS) {
                return false;
            }
            buckets.put(key, new AttemptBucket(now, now, 1));
            return true;
        }

        int nextCount = Math.min(maxAttempts, current.attemptCount() + 1);
        if (current.attemptCount() >= maxAttempts
                || now.isBefore(current.lastAttemptAt().plus(cooldown))) {
            buckets.put(key, new AttemptBucket(current.windowStartedAt(), now, nextCount));
            return false;
        }

        buckets.put(key, new AttemptBucket(current.windowStartedAt(), now, nextCount));
        return true;
    }

    /** Clears process-local counters between isolated integration tests. */
    public synchronized void clear() {
        buckets.clear();
    }

    private void removeExpired(Instant now) {
        Iterator<AttemptBucket> values = buckets.values().iterator();
        while (values.hasNext()) {
            AttemptBucket bucket = values.next();
            if (!now.isBefore(bucket.windowStartedAt().plus(attemptWindow))) {
                values.remove();
            }
        }
    }

    private record AttemptBucket(Instant windowStartedAt, Instant lastAttemptAt, int attemptCount) {
    }
}
