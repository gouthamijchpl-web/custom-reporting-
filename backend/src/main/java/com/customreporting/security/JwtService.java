package com.customreporting.security;

import com.customreporting.config.SecurityProperties;
import com.customreporting.exception.InvalidTokenException;
import com.customreporting.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and verifies short lived HS256 access tokens.
 *
 * <p>Tokens are deliberately minimal: subject, display claims for the UI, the role, and a
 * {@code cat} claim recording when the account's credentials last changed. The filter
 * refuses any token whose credential version no longer matches the account, which makes a
 * password change invalidate every token already in circulation.</p>
 */
@Service
public class JwtService {

    private static final int MINIMUM_SECRET_LENGTH = 32;

    static final String CLAIM_EMAIL = "email";
    static final String CLAIM_NAME = "name";
    static final String CLAIM_ROLE = "role";
    static final String CLAIM_CREDENTIALS_VERSION = "cv";

    private final SecretKey signingKey;
    private final String issuer;
    private final Duration accessTokenTtl;

    public JwtService(SecurityProperties properties) {
        String secret = properties.jwt().secret();
        if (secret.length() < MINIMUM_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "app.security.jwt.secret must be at least " + MINIMUM_SECRET_LENGTH + " characters long");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = properties.jwt().issuer();
        this.accessTokenTtl = properties.jwt().accessTokenTtl();
    }

    public Duration accessTokenTtl() {
        return accessTokenTtl;
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(issuer)
                .subject(user.getId().toString())
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_NAME, user.getFullName())
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(CLAIM_CREDENTIALS_VERSION, user.getCredentialsVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Verifies the signature, issuer and expiry of an access token.
     *
     * @throws InvalidTokenException if the token is malformed, tampered with or expired
     */
    public AccessTokenClaims parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return new AccessTokenClaims(
                    UUID.fromString(claims.getSubject()),
                    claims.get(CLAIM_EMAIL, String.class),
                    claims.getIssuedAt().toInstant(),
                    claims.get(CLAIM_CREDENTIALS_VERSION, Number.class).intValue()
            );
        } catch (JwtException | IllegalArgumentException | NullPointerException ex) {
            throw new InvalidTokenException("The access token is invalid or has expired.");
        }
    }

    /**
     * Verified contents of an access token.
     *
     * @param userId               account the token was issued for
     * @param email                login identifier at the time of issue
     * @param issuedAt             issue instant, compared against credential changes
     * @param credentialsVersion credential generation the token was minted for
     */
    public record AccessTokenClaims(UUID userId, String email, Instant issuedAt, int credentialsVersion) {
    }
}
