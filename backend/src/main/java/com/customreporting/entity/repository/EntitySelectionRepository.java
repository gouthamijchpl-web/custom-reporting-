package com.customreporting.entity.repository;

import com.customreporting.entity.model.EntitySelection;
import com.customreporting.entity.model.ReportingEntity;
import com.customreporting.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EntitySelectionRepository extends JpaRepository<EntitySelection, UUID> {

    Optional<EntitySelection> findByUser(User user);

    /**
     * Clears the selection for every account pointing at an entity that is about to be
     * removed, so no row is left referencing it.
     */
    @Modifying
    @Query("update EntitySelection selection set selection.selectedEntity = null "
            + "where selection.selectedEntity = :entity")
    int clearSelectionsOf(@Param("entity") ReportingEntity entity);
}
