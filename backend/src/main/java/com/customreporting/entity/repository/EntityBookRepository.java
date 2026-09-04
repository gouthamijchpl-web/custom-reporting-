package com.customreporting.entity.repository;

import com.customreporting.entity.model.EntityBook;
import com.customreporting.entity.model.ReportingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EntityBookRepository extends JpaRepository<EntityBook, UUID> {
    List<EntityBook> findByReportingEntityAndArchivedAtIsNullOrderByNameAsc(ReportingEntity entity);
    Optional<EntityBook> findByIdAndReportingEntityAndArchivedAtIsNull(UUID id, ReportingEntity entity);
    Optional<EntityBook> findByReportingEntityAndPrimaryBookTrueAndArchivedAtIsNull(ReportingEntity entity);
}
