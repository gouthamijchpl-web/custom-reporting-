package com.customreporting.entity.repository;

import com.customreporting.entity.model.GstinRegistration;
import com.customreporting.entity.model.ReportingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GstinRegistrationRepository extends JpaRepository<GstinRegistration, UUID> {
    List<GstinRegistration> findByReportingEntityAndArchivedAtIsNullOrderByGstinAsc(ReportingEntity entity);
    Optional<GstinRegistration> findByIdAndReportingEntityAndArchivedAtIsNull(UUID id, ReportingEntity entity);
    boolean existsByGstinIgnoreCaseAndArchivedAtIsNull(String gstin);
    boolean existsByGstinIgnoreCaseAndArchivedAtIsNullAndIdNot(String gstin, UUID id);
}
