package com.customreporting.settings.service;

import com.customreporting.settings.dto.*;
import com.customreporting.settings.model.WorkspaceConfiguration;
import com.customreporting.settings.repository.WorkspaceConfigurationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

@Service
public class WorkspaceConfigurationService {
    private final WorkspaceConfigurationRepository repository;
    public WorkspaceConfigurationService(WorkspaceConfigurationRepository repository) { this.repository = repository; }

    @Transactional
    public WorkspaceConfigurationResponse get() { return WorkspaceConfigurationResponse.from(requireConfiguration()); }

    @Transactional
    public WorkspaceConfigurationResponse update(WorkspaceConfigurationRequest request) {
        WorkspaceConfiguration value = requireConfiguration();
        value.setName(request.name().trim());
        value.setCode(request.code().trim().toUpperCase(Locale.ROOT));
        value.setDescription(trimToNull(request.description()));
        value.setActive(request.active());
        value.setDefaultCurrency(request.defaultCurrency().trim().toUpperCase(Locale.ROOT));
        value.setTimeZone(request.timeZone().trim());
        return WorkspaceConfigurationResponse.from(repository.save(value));
    }

    private WorkspaceConfiguration requireConfiguration() {
        return repository.findFirstByOrderByCreatedAtAsc()
                .orElseGet(() -> repository.save(new WorkspaceConfiguration("Custom Reporting Workspace", "DEFAULT")));
    }
    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
