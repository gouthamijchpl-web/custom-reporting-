package com.customreporting.common;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unauthenticated liveness probe, used by the frontend to tell "server unreachable" apart
 * from "not signed in".
 */
@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Service availability")
public class HealthController {

    @GetMapping
    @Operation(summary = "Confirm the API is reachable")
    public ResponseEntity<MessageResponse> health() {
        return ResponseEntity.ok(MessageResponse.of("Custom Reporting API is running."));
    }
}
