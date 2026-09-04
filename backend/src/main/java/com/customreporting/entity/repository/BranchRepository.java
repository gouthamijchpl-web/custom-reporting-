package com.customreporting.entity.repository;

import com.customreporting.entity.model.Branch;
import com.customreporting.entity.model.ReportingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    List<Branch> findByReportingEntityAndArchivedAtIsNullOrderByNameAsc(ReportingEntity entity);
    Optional<Branch> findByIdAndReportingEntityAndArchivedAtIsNull(UUID id, ReportingEntity entity);
    boolean existsByReportingEntityAndCodeIgnoreCaseAndArchivedAtIsNull(ReportingEntity entity, String code);
    boolean existsByReportingEntityAndCodeIgnoreCaseAndArchivedAtIsNullAndIdNot(ReportingEntity entity, String code, UUID id);
    Optional<Branch> findByReportingEntityAndPrimaryBranchTrueAndArchivedAtIsNull(ReportingEntity entity);
}
