package com.customreporting.modules.upload.repository;

import com.customreporting.modules.upload.model.UploadState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UploadStateRepository extends JpaRepository<UploadState, UUID> {
    Optional<UploadState> findByScopeKey(String scopeKey);
    void deleteByScopeKey(String scopeKey);
}
