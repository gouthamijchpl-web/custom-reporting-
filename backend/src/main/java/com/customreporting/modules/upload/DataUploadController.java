package com.customreporting.modules.upload;

import com.customreporting.modules.upload.dto.UploadStateRequest;
import com.customreporting.modules.upload.dto.UploadStateResponse;
import com.customreporting.modules.upload.service.UploadStateService;
import com.customreporting.security.AppUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Cloud persistence for normalized report source files. */
@RestController
@RequestMapping("/api/v1/uploads/state")
@Tag(name = "Data Upload", description = "Supabase-backed uploaded report data")
public class DataUploadController {

    private final UploadStateService service;

    public DataUploadController(UploadStateService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Load uploaded data for an entity or branch")
    public ResponseEntity<UploadStateResponse> get(@RequestParam UUID entityId,
                                                   @RequestParam(required = false) UUID branchId) {
        return ResponseEntity.ok(service.get(entityId, branchId));
    }

    @PutMapping
    @Operation(summary = "Store uploaded data for an entity or branch")
    public ResponseEntity<UploadStateResponse> put(@AuthenticationPrincipal AppUserPrincipal principal,
                                                   @Valid @RequestBody UploadStateRequest request) {
        return ResponseEntity.ok(service.put(principal.getId(), request));
    }

    @DeleteMapping
    @Operation(summary = "Remove all uploaded data for an entity or branch")
    public ResponseEntity<Void> delete(@RequestParam UUID entityId,
                                       @RequestParam(required = false) UUID branchId) {
        service.delete(entityId, branchId);
        return ResponseEntity.noContent().build();
    }
}
