package com.customreporting.settings.controller;

import com.customreporting.security.AppUserPrincipal;
import com.customreporting.settings.dto.UserPreferenceRequest;
import com.customreporting.settings.dto.UserPreferenceResponse;
import com.customreporting.settings.service.UserPreferenceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/preferences")
public class UserPreferenceController {
    private final UserPreferenceService service;
    public UserPreferenceController(UserPreferenceService service) { this.service = service; }

    @GetMapping("/{key}")
    public ResponseEntity<UserPreferenceResponse> get(@AuthenticationPrincipal AppUserPrincipal principal,
                                                      @PathVariable String key) {
        return ResponseEntity.ok(service.get(principal.getId(), key));
    }

    @PutMapping("/{key}")
    public ResponseEntity<UserPreferenceResponse> put(@AuthenticationPrincipal AppUserPrincipal principal,
                                                      @PathVariable String key,
                                                      @Valid @RequestBody UserPreferenceRequest request) {
        return ResponseEntity.ok(service.put(principal.getId(), key, request));
    }
}
