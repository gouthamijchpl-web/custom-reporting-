package com.customreporting.settings.controller;

import com.customreporting.settings.dto.*;
import com.customreporting.settings.service.WorkspaceConfigurationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings/workspace")
public class WorkspaceConfigurationController {
    private final WorkspaceConfigurationService service;
    public WorkspaceConfigurationController(WorkspaceConfigurationService service) { this.service = service; }
    @GetMapping public WorkspaceConfigurationResponse get() { return service.get(); }
    @PutMapping @PreAuthorize("hasRole('ADMIN')")
    public WorkspaceConfigurationResponse update(@Valid @RequestBody WorkspaceConfigurationRequest request) {
        return service.update(request);
    }
}
