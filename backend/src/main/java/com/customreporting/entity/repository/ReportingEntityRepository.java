package com.customreporting.entity.repository;

import com.customreporting.businessgroup.model.BusinessGroup;
import com.customreporting.entity.model.ReportingEntity;
import com.customreporting.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Every method is scoped by owner so an entity can never be read or modified across
 * accounts, even if an identifier is guessed.
 */
@Repository
public interface ReportingEntityRepository extends JpaRepository<ReportingEntity, UUID> {

    List<ReportingEntity> findByOwnerOrderByNameAsc(User owner);

    Optional<ReportingEntity> findByIdAndOwner(UUID id, User owner);

    boolean existsByOwnerAndNameIgnoreCase(User owner, String name);

    boolean existsByOwnerAndNameIgnoreCaseAndIdNot(User owner, String name, UUID id);

    boolean existsByOwnerAndCodeIgnoreCase(User owner, String code);

    boolean existsByOwnerAndCodeIgnoreCaseAndIdNot(User owner, String code, UUID id);

    long countByOwner(User owner);

    List<ReportingEntity> findByArchivedAtIsNullOrderByNameAsc();

    Optional<ReportingEntity> findByIdAndArchivedAtIsNull(UUID id);

    boolean existsByNameIgnoreCaseAndArchivedAtIsNull(String name);

    boolean existsByNameIgnoreCaseAndArchivedAtIsNullAndIdNot(String name, UUID id);

    boolean existsByCodeIgnoreCaseAndArchivedAtIsNull(String code);

    boolean existsByCodeIgnoreCaseAndArchivedAtIsNullAndIdNot(String code, UUID id);

    long countByArchivedAtIsNull();

    @Modifying
    @Query("update ReportingEntity entity set entity.businessGroup = null where entity.businessGroup = :group")
    int clearBusinessGroup(@Param("group") BusinessGroup group);
}
