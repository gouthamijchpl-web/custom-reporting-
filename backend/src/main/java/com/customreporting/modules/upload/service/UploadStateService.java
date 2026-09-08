package com.customreporting.modules.upload.service;

import com.customreporting.entity.model.Branch;
import com.customreporting.entity.model.ReportingEntity;
import com.customreporting.entity.repository.BranchRepository;
import com.customreporting.entity.service.EntityService;
import com.customreporting.exception.BusinessRuleException;
import com.customreporting.exception.ResourceNotFoundException;
import com.customreporting.modules.upload.dto.UploadStateRequest;
import com.customreporting.modules.upload.dto.UploadStateResponse;
import com.customreporting.modules.upload.model.UploadState;
import com.customreporting.modules.upload.repository.UploadStateRepository;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UploadStateService {

    private static final int MAX_PAYLOAD_CHARACTERS = 75_000_000;

    private final UploadStateRepository repository;
    private final EntityService entityService;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public UploadStateService(UploadStateRepository repository, EntityService entityService,
                              BranchRepository branchRepository, UserRepository userRepository,
                              ObjectMapper objectMapper) {
        this.repository = repository;
        this.entityService = entityService;
        this.branchRepository = branchRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public UploadStateResponse get(UUID entityId, UUID branchId) {
        Scope scope = requireScope(entityId, branchId);
        return repository.findByScopeKey(scope.key())
                .map(this::response)
                .orElseGet(() -> new UploadStateResponse(entityId, branchId,
                        JsonNodeFactory.instance.objectNode(), null));
    }

    @Transactional
    public UploadStateResponse put(UUID userId, UploadStateRequest request) {
        Scope scope = requireScope(request.entityId(), request.branchId());
        String payload = serialize(request.uploadsByType());
        if (payload.length() > MAX_PAYLOAD_CHARACTERS) {
            throw new BusinessRuleException("Uploaded data is too large to save in one workspace snapshot.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
        UploadState value = repository.findByScopeKey(scope.key())
                .orElseGet(() -> new UploadState(scope.key(), scope.entity(), scope.branch(), user, payload));
        value.setPayloadJson(payload);
        value.setUpdatedBy(user);
        return response(repository.save(value));
    }

    @Transactional
    public void delete(UUID entityId, UUID branchId) {
        Scope scope = requireScope(entityId, branchId);
        repository.deleteByScopeKey(scope.key());
    }

    private Scope requireScope(UUID entityId, UUID branchId) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        Branch branch = branchId == null ? null : branchRepository
                .findByIdAndReportingEntityAndArchivedAtIsNull(branchId, entity)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found."));
        String key = entityId + (branch == null ? ":entity" : ":branch:" + branchId);
        return new Scope(key, entity, branch);
    }

    private String serialize(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessRuleException("Uploaded data could not be serialized.");
        }
    }

    private UploadStateResponse response(UploadState value) {
        try {
            return new UploadStateResponse(value.getReportingEntity().getId(),
                    value.getBranch() == null ? null : value.getBranch().getId(),
                    objectMapper.readTree(value.getPayloadJson()), value.getUpdatedAt());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored uploaded data is invalid JSON.", exception);
        }
    }

    private record Scope(String key, ReportingEntity entity, Branch branch) {
    }
}
