package com.customreporting.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Externalised security tuning, bound from the {@code app.security.*} configuration tree.
 * Every value has a safe local-development default; production overrides come from
 * environment variables (see {@code application-prod.yml}).
 */
@Validated
@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull RefreshToken refreshToken,
        @Valid @NotNull Lockout lockout,
        @Valid @NotNull PasswordReset passwordReset,

        /*
         * When true, a failed sign-in says whether the email address was unknown or the
         * password was wrong. That is a real help while developing, and a real problem in
         * production: it turns the sign-in form into a way of discovering which addresses
         * hold accounts. Enabled only by the dev profile.
         */
        boolean detailedAuthenticationErrors
) {

    /**
     * Signing configuration for short lived access tokens.
     *
     * @param secret         HMAC-SHA key material; must be at least 32 characters
     * @param issuer         value placed in the {@code iss} claim
     * @param accessTokenTtl lifetime of an access token
     */
    public record Jwt(
            @NotBlank String secret,
            @NotBlank String issuer,
            @NotNull Duration accessTokenTtl
    ) {
    }

    /**
     * Configuration of the opaque refresh token and the httpOnly cookie carrying it.
     *
     * @param cookieName     name of the refresh cookie
     * @param cookiePath     path the cookie is scoped to, limiting where it is sent
     * @param ttl            lifetime of a standard session
     * @param rememberMeTtl  lifetime when the user ticked "Remember me"
     * @param secureCookie   whether the cookie requires HTTPS; must be true in production
     * @param sameSite       SameSite attribute guarding against cross-site request forgery
     */
    public record RefreshToken(
            @NotBlank String cookieName,
            @NotBlank String cookiePath,
            @NotNull Duration ttl,
            @NotNull Duration rememberMeTtl,
            boolean secureCookie,
            @NotBlank String sameSite
    ) {
    }

    /**
     * Brute-force protection: temporarily locks an account after repeated failures.
     *
     * @param maxFailedAttempts failures tolerated before the account is locked
     * @param lockDuration      how long the lock lasts
     */
    public record Lockout(
            @Min(1) int maxFailedAttempts,
            @NotNull Duration lockDuration
    ) {
    }

    /** Abuse protection for the prototype-only in-application password creation flow. */
    public record PasswordReset(
            @Min(1) int maxAttempts,
            @NotNull Duration attemptWindow,
            @NotNull Duration cooldown
    ) {
    }
}
