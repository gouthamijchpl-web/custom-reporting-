package com.customreporting.auth.dto;

/**
 * Returned by sign-in and token refresh.
 *
 * <p>Only the short lived access token is present in the body; the refresh token travels
 * separately in an httpOnly cookie so that scripts on the page can never read it.</p>
 *
 * @param accessToken      bearer token for subsequent API calls
 * @param tokenType        always {@code Bearer}
 * @param expiresInSeconds remaining lifetime, used by the client to refresh pre-emptively
 * @param user             the signed-in account
 */
public record AuthenticationResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        UserResponse user
) {

    public static AuthenticationResponse of(String accessToken, long expiresInSeconds, UserResponse user) {
        return new AuthenticationResponse(accessToken, "Bearer", expiresInSeconds, user);
    }
}
