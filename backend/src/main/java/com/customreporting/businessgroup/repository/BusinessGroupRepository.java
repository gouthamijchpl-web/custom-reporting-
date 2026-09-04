package com.customreporting.businessgroup.repository;

import com.customreporting.businessgroup.model.BusinessGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BusinessGroupRepository extends JpaRepository<BusinessGroup, UUID> {
    List<BusinessGroup> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
    boolean existsBySeriesCodeIgnoreCase(String seriesCode);
    boolean existsBySeriesCodeIgnoreCaseAndIdNot(String seriesCode, UUID id);
}
