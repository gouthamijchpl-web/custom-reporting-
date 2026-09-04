package com.customreporting.auth.service;

import com.customreporting.auth.dto.AuthenticationResponse;

import java.time.Duration;

/**
 * Outcome of a successful sign-in or refresh.
 *
 * <p>The service returns the raw refresh token and its lifetime rather than writing a
 * cookie itself, keeping HTTP concerns in the controller layer.</p>
 *
 * @param response        body to send back to the client
 * @param refreshToken    raw refresh token to place in the httpOnly cookie
 * @param refreshTokenTtl lifetime the cookie should be given
 */
public record AuthenticationResult(
        AuthenticationResponse response,
        String refreshToken,
        Duration refreshTokenTtl
) {
}
