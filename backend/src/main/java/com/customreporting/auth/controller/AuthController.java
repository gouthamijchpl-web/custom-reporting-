package com.customreporting.auth.controller;

import com.customreporting.auth.dto.AuthenticationResponse;
import com.customreporting.auth.dto.ForgotPasswordRequest;
import com.customreporting.auth.dto.LoginRequest;
import com.customreporting.auth.dto.SignupRequest;
import com.customreporting.auth.dto.UserResponse;
import com.customreporting.auth.service.AuthService;
import com.customreporting.auth.service.AuthenticationResult;
import com.customreporting.common.MessageResponse;
import com.customreporting.security.AppUserPrincipal;
import com.customreporting.security.RefreshTokenCookieService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public authentication endpoints.
 *
 * <p>This layer only converts between HTTP and the service API: reading the refresh
 * cookie, writing it back, and mapping results to status codes. All rules live in
 * {@link AuthService}.</p>
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Registration, sign-in, session refresh and password recovery")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieService refreshCookieService;

    public AuthController(AuthService authService,
                          RefreshTokenCookieService refreshCookieService) {
        this.authService = authService;
        this.refreshCookieService = refreshCookieService;
    }

    @PostMapping("/signup")
    @Operation(summary = "Register a new account")
    public ResponseEntity<UserResponse> signup(@Valid @RequestBody SignupRequest request) {
        UserResponse created = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/login")
    @Operation(summary = "Sign in and open a session")
    public ResponseEntity<AuthenticationResponse> login(@Valid @RequestBody LoginRequest request,
                                                        HttpServletRequest servletRequest) {
        AuthenticationResult result = authService.login(
                request, servletRequest.getHeader(HttpHeaders.USER_AGENT), clientIp(servletRequest));
        return respondWithSession(result);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange the refresh cookie for a new access token")
    public ResponseEntity<AuthenticationResponse> refresh(HttpServletRequest servletRequest) {
        String refreshToken = refreshCookieService.read(servletRequest).orElse(null);
        AuthenticationResult result = authService.refresh(
                refreshToken, servletRequest.getHeader(HttpHeaders.USER_AGENT), clientIp(servletRequest));
        return respondWithSession(result);
    }

    @PostMapping("/logout")
    @Operation(summary = "End the current session")
    public ResponseEntity<MessageResponse> logout(HttpServletRequest servletRequest) {
        refreshCookieService.read(servletRequest).ifPresent(authService::logout);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.clear().toString())
                .body(MessageResponse.of("You have been signed out."));
    }

    @GetMapping("/me")
    @Operation(summary = "Return the signed-in account")
    public ResponseEntity<UserResponse> currentUser(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(authService.getCurrentUser(principal.getId()));
    }

    /** Prototype-only direct password creation without email or an external reset link. */
    @PostMapping("/forgot-password")
    @Operation(summary = "Create a new password using the account email")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.createPassword(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.clear().toString())
                .body(MessageResponse.of("Your password has been changed successfully."));
    }

    private ResponseEntity<AuthenticationResponse> respondWithSession(AuthenticationResult result) {
        ResponseCookie cookie = refreshCookieService.create(result.refreshToken(), result.refreshTokenTtl());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.response());
    }

    /**
     * Best effort client address for the session audit trail. Proxy headers are only
     * meaningful when the application sits behind a trusted proxy that sets them.
     */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
