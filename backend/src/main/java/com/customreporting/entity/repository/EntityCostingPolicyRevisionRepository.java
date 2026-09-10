package com.customreporting.entity.repository;

import com.customreporting.entity.model.EntityCostingPolicyRevision;
import com.customreporting.entity.model.ReportingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface EntityCostingPolicyRevisionRepository extends JpaRepository<EntityCostingPolicyRevision, UUID> {
    List<EntityCostingPolicyRevision> findByReportingEntityOrderByEffectiveFromAscCreatedAtAsc(ReportingEntity entity);
    void deleteByReportingEntity(ReportingEntity entity);
    void deleteByReportingEntityAndEffectiveFromGreaterThanEqual(ReportingEntity entity, LocalDate effectiveFrom);
}

