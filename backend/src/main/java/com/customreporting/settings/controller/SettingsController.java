package com.customreporting.settings.controller;

import com.customreporting.auth.dto.UserResponse;
import com.customreporting.common.MessageResponse;
import com.customreporting.security.AppUserPrincipal;
import com.customreporting.security.RefreshTokenCookieService;
import com.customreporting.settings.dto.ChangePasswordRequest;
import com.customreporting.settings.dto.UpdateAccountRequest;
import com.customreporting.settings.service.SettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Settings endpoints for the signed-in account. Every operation is scoped to the
 * authenticated principal, so one user can never read or modify another user's settings.
 */
@RestController
@RequestMapping("/api/v1/settings")
@Tag(name = "Settings", description = "Account profile and security for the signed-in user")
public class SettingsController {

    private final SettingsService settingsService;
    private final RefreshTokenCookieService refreshCookieService;

    public SettingsController(SettingsService settingsService,
                              RefreshTokenCookieService refreshCookieService) {
        this.settingsService = settingsService;
        this.refreshCookieService = refreshCookieService;
    }

    @GetMapping("/account")
    @Operation(summary = "Read the account profile")
    public ResponseEntity<UserResponse> getAccount(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(settingsService.getAccount(principal.getId()));
    }

    @PutMapping("/account")
    @Operation(summary = "Update the account profile")
    public ResponseEntity<UserResponse> updateAccount(@AuthenticationPrincipal AppUserPrincipal principal,
                                                      @Valid @RequestBody UpdateAccountRequest request) {
        return ResponseEntity.ok(settingsService.updateAccount(principal.getId(), request));
    }

    /**
     * Changes the password and ends every session, including this one, so the user is
     * asked to sign in again with the new credentials.
     */
    @PutMapping("/password")
    @Operation(summary = "Change the account password")
    public ResponseEntity<MessageResponse> changePassword(@AuthenticationPrincipal AppUserPrincipal principal,
                                                          @Valid @RequestBody ChangePasswordRequest request) {
        settingsService.changePassword(principal.getId(), request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.clear().toString())
                .body(MessageResponse.of("Your password has been updated. Please sign in again."));
    }
}
