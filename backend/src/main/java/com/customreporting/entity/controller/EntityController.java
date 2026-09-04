package com.customreporting.entity.controller;

import com.customreporting.entity.dto.CreateEntityRequest;
import com.customreporting.entity.dto.EntityListResponse;
import com.customreporting.entity.dto.EntityResponse;
import com.customreporting.entity.dto.SelectEntityRequest;
import com.customreporting.entity.dto.UpdateEntityRequest;
import com.customreporting.entity.dto.UpdateStatusRequest;
import com.customreporting.entity.service.EntityService;
import com.customreporting.security.AppUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Entities the signed-in account reports on, and the currently active one.
 *
 * <p>Every operation is scoped to the authenticated principal by the service layer.</p>
 */
@RestController
@RequestMapping("/api/v1/entities")
@Tag(name = "Entities", description = "Businesses the account reports on, and the active selection")
public class EntityController {

    private final EntityService entityService;

    public EntityController(EntityService entityService) {
        this.entityService = entityService;
    }

    @GetMapping
    @Operation(summary = "List the account's entities and the active selection")
    public ResponseEntity<EntityListResponse> list(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(entityService.list(principal.getId()));
    }

    @PostMapping
    @Operation(summary = "Create an entity")
    public ResponseEntity<EntityResponse> create(@AuthenticationPrincipal AppUserPrincipal principal,
                                                 @Valid @RequestBody CreateEntityRequest request) {
        EntityResponse created = entityService.create(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{entityId}")
    @Operation(summary = "Update an entity")
    public ResponseEntity<EntityResponse> update(@AuthenticationPrincipal AppUserPrincipal principal,
                                                 @PathVariable UUID entityId,
                                                 @Valid @RequestBody UpdateEntityRequest request) {
        return ResponseEntity.ok(entityService.update(principal.getId(), entityId, request));
    }

    @DeleteMapping("/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete an entity")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserPrincipal principal,
                                       @PathVariable UUID entityId) {
        entityService.delete(principal.getId(), entityId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{entityId}")
    public ResponseEntity<EntityResponse> get(@AuthenticationPrincipal AppUserPrincipal principal,
                                              @PathVariable UUID entityId) {
        return ResponseEntity.ok(entityService.get(principal.getId(), entityId));
    }

    @PatchMapping("/{entityId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityResponse> changeStatus(@AuthenticationPrincipal AppUserPrincipal principal,
                                                       @PathVariable UUID entityId,
                                                       @RequestBody UpdateStatusRequest request) {
        return ResponseEntity.ok(entityService.changeStatus(principal.getId(), entityId, request.active()));
    }

    @PutMapping("/selection")
    @Operation(summary = "Set the active entity")
    public ResponseEntity<EntityListResponse> select(@AuthenticationPrincipal AppUserPrincipal principal,
                                                     @Valid @RequestBody SelectEntityRequest request) {
        return ResponseEntity.ok(entityService.select(principal.getId(), request.entityId()));
    }
}
