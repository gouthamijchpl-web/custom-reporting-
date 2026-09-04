package com.customreporting.entity.controller;

import com.customreporting.entity.dto.EntityConfigurationDtos.*;
import com.customreporting.entity.dto.UpdateStatusRequest;
import com.customreporting.entity.service.EntityConfigurationService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/entities/{entityId}")
public class EntityConfigurationController {
    private final EntityConfigurationService service;
    public EntityConfigurationController(EntityConfigurationService service) { this.service = service; }

    @GetMapping("/branches") public List<BranchResponse> branches(@PathVariable UUID entityId) { return service.branches(entityId); }
    @PostMapping("/branches")
    public ResponseEntity<BranchResponse> createBranch(@PathVariable UUID entityId, @Valid @RequestBody BranchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createBranch(entityId, request));
    }
    @PutMapping("/branches/{id}")
    public BranchResponse updateBranch(@PathVariable UUID entityId, @PathVariable UUID id, @Valid @RequestBody BranchRequest request) {
        return service.updateBranch(entityId, id, request);
    }
    @PatchMapping("/branches/{id}/status") @PreAuthorize("hasRole('ADMIN')")
    public BranchResponse branchStatus(@PathVariable UUID entityId, @PathVariable UUID id, @RequestBody UpdateStatusRequest request) {
        return service.changeBranchStatus(entityId, id, request.active());
    }
    @DeleteMapping("/branches/{id}") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> archiveBranch(@PathVariable UUID entityId, @PathVariable UUID id) {
        service.archiveBranch(entityId, id); return ResponseEntity.noContent().build();
    }

    @GetMapping("/gstins") public List<GstinResponse> gstins(@PathVariable UUID entityId) { return service.gstins(entityId); }
    @PostMapping("/gstins")
    public ResponseEntity<GstinResponse> createGstin(@PathVariable UUID entityId, @Valid @RequestBody GstinRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createGstin(entityId, request));
    }
    @PutMapping("/gstins/{id}")
    public GstinResponse updateGstin(@PathVariable UUID entityId, @PathVariable UUID id, @Valid @RequestBody GstinRequest request) {
        return service.updateGstin(entityId, id, request);
    }
    @PatchMapping("/gstins/{id}/status") @PreAuthorize("hasRole('ADMIN')")
    public GstinResponse gstinStatus(@PathVariable UUID entityId, @PathVariable UUID id, @RequestBody UpdateStatusRequest request) {
        return service.changeGstinStatus(entityId, id, request.active());
    }
    @DeleteMapping("/gstins/{id}") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> archiveGstin(@PathVariable UUID entityId, @PathVariable UUID id) {
        service.archiveGstin(entityId, id); return ResponseEntity.noContent().build();
    }

    @GetMapping("/books") public List<BookResponse> books(@PathVariable UUID entityId) { return service.books(entityId); }
    @PostMapping("/books")
    public ResponseEntity<BookResponse> createBook(@PathVariable UUID entityId, @Valid @RequestBody BookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createBook(entityId, request));
    }
    @PutMapping("/books/{id}")
    public BookResponse updateBook(@PathVariable UUID entityId, @PathVariable UUID id, @Valid @RequestBody BookRequest request) {
        return service.updateBook(entityId, id, request);
    }
    @PatchMapping("/books/{id}/status") @PreAuthorize("hasRole('ADMIN')")
    public BookResponse bookStatus(@PathVariable UUID entityId, @PathVariable UUID id, @RequestBody UpdateStatusRequest request) {
        return service.changeBookStatus(entityId, id, request.active());
    }
    @DeleteMapping("/books/{id}") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> archiveBook(@PathVariable UUID entityId, @PathVariable UUID id) {
        service.archiveBook(entityId, id); return ResponseEntity.noContent().build();
    }
}
