package com.customreporting.settings.repository;

import com.customreporting.settings.model.WorkspaceConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceConfigurationRepository extends JpaRepository<WorkspaceConfiguration, UUID> {
    Optional<WorkspaceConfiguration> findFirstByOrderByCreatedAtAsc();
}
