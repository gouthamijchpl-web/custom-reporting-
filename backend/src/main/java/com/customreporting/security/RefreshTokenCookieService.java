package com.customreporting.security;

import com.customreporting.config.SecurityProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;

/**
 * Builds and reads the httpOnly cookie that carries the refresh token.
 *
 * <p>Keeping the long lived token in an httpOnly cookie means injected scripts cannot read
 * it, and scoping the cookie to the auth endpoints means it is not attached to ordinary
 * API calls. The SameSite attribute is what protects the refresh endpoint from
 * cross-site request forgery, since the API itself is stateless and CSRF tokens are not
 * used for bearer authenticated requests.</p>
 */
@Service
public class RefreshTokenCookieService {

    private final SecurityProperties.RefreshToken properties;

    public RefreshTokenCookieService(SecurityProperties securityProperties) {
        this.properties = securityProperties.refreshToken();
    }

    /** @return a {@code Set-Cookie} value storing {@code refreshToken} for {@code ttl} */
    public ResponseCookie create(String refreshToken, Duration ttl) {
        return baseCookie(refreshToken)
                .maxAge(ttl)
                .build();
    }

    /** @return a {@code Set-Cookie} value that immediately removes the cookie */
    public ResponseCookie clear() {
        return baseCookie("")
                .maxAge(Duration.ZERO)
                .build();
    }

    public Optional<String> read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(cookie -> properties.cookieName().equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(value -> value != null && !value.isBlank())
                .findFirst();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(properties.cookieName(), value)
                .httpOnly(true)
                .secure(properties.secureCookie())
                .sameSite(properties.sameSite())
                .path(properties.cookiePath());
    }
}
