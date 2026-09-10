package com.customreporting.entity.service;

import com.customreporting.entity.dto.CostingPolicyDtos.CostingPolicyRequest;
import com.customreporting.entity.dto.CostingPolicyDtos.CostingPolicyResponse;
import com.customreporting.entity.dto.CostingPolicyDtos.CostingPolicyRevisionResponse;
import com.customreporting.entity.model.EntityCostingPolicyRevision;
import com.customreporting.entity.model.InventoryCostingMethod;
import com.customreporting.entity.model.ReportingEntity;
import com.customreporting.entity.repository.EntityCostingPolicyRevisionRepository;
import com.customreporting.exception.BusinessRuleException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class EntityCostingPolicyService {
    private final EntityService entityService;
    private final EntityCostingPolicyRevisionRepository repository;

    public EntityCostingPolicyService(EntityService entityService,
                                      EntityCostingPolicyRevisionRepository repository) {
        this.entityService = entityService;
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public CostingPolicyResponse get(UUID entityId) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        return response(entity, repository.findByReportingEntityOrderByEffectiveFromAscCreatedAtAsc(entity));
    }

    @Transactional
    public CostingPolicyResponse update(UUID entityId, CostingPolicyRequest request) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        if (request.applicationMode() == com.customreporting.entity.dto.CostingPolicyDtos.ApplicationMode.EFFECTIVE_DATE
                && request.effectiveDate() == null) {
            throw new BusinessRuleException("Choose the date from which the new costing method applies.");
        }

        List<EntityCostingPolicyRevision> existing =
                repository.findByReportingEntityOrderByEffectiveFromAscCreatedAtAsc(entity);
        ensureBaseline(entity, existing);

        if (request.applicationMode() == com.customreporting.entity.dto.CostingPolicyDtos.ApplicationMode.RECALCULATE_ALL) {
            repository.deleteByReportingEntity(entity);
            repository.flush();
            repository.save(new EntityCostingPolicyRevision(entity, request.method(), null));
        } else {
            repository.deleteByReportingEntityAndEffectiveFromGreaterThanEqual(entity, request.effectiveDate());
            repository.save(new EntityCostingPolicyRevision(entity, request.method(), request.effectiveDate()));
        }
        repository.flush();
        return response(entity, repository.findByReportingEntityOrderByEffectiveFromAscCreatedAtAsc(entity));
    }

    private void ensureBaseline(ReportingEntity entity, List<EntityCostingPolicyRevision> revisions) {
        if (revisions.stream().anyMatch(revision -> revision.getEffectiveFrom() == null)) return;
        repository.save(new EntityCostingPolicyRevision(entity, InventoryCostingMethod.MOVING_WEIGHTED_AVERAGE, null));
    }

    private CostingPolicyResponse response(ReportingEntity entity, List<EntityCostingPolicyRevision> stored) {
        List<EntityCostingPolicyRevision> revisions = new ArrayList<>(stored);
        if (revisions.isEmpty()) {
            return new CostingPolicyResponse(entity.getId(), InventoryCostingMethod.MOVING_WEIGHTED_AVERAGE,
                    List.of(new CostingPolicyRevisionResponse(null,
                            InventoryCostingMethod.MOVING_WEIGHTED_AVERAGE, null, null)));
        }
        revisions.sort(Comparator.comparing(EntityCostingPolicyRevision::getEffectiveFrom,
                Comparator.nullsFirst(Comparator.naturalOrder())).thenComparing(EntityCostingPolicyRevision::getCreatedAt));
        LocalDate today = LocalDate.now();
        InventoryCostingMethod current = revisions.stream()
                .filter(revision -> revision.getEffectiveFrom() == null || !revision.getEffectiveFrom().isAfter(today))
                .reduce((first, second) -> second)
                .map(EntityCostingPolicyRevision::getCostingMethod)
                .orElse(InventoryCostingMethod.MOVING_WEIGHTED_AVERAGE);
        return new CostingPolicyResponse(entity.getId(), current,
                revisions.stream().map(CostingPolicyRevisionResponse::from).toList());
    }
}

