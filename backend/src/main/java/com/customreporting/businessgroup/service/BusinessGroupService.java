package com.customreporting.businessgroup.service;

import com.customreporting.businessgroup.dto.CreateGroupRequest;
import com.customreporting.businessgroup.dto.GroupResponse;
import com.customreporting.businessgroup.model.BusinessGroup;
import com.customreporting.businessgroup.repository.BusinessGroupRepository;
import com.customreporting.entity.repository.ReportingEntityRepository;
import com.customreporting.exception.DuplicateResourceException;
import com.customreporting.exception.ErrorCode;
import com.customreporting.exception.ResourceNotFoundException;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class BusinessGroupService {
    private final BusinessGroupRepository groupRepository;
    private final UserRepository userRepository;
    private final ReportingEntityRepository entityRepository;

    public BusinessGroupService(BusinessGroupRepository groupRepository, UserRepository userRepository,
                                ReportingEntityRepository entityRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.entityRepository = entityRepository;
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> list() {
        return groupRepository.findAllByOrderByNameAsc().stream().map(GroupResponse::from).toList();
    }

    @Transactional
    public GroupResponse create(UUID userId, CreateGroupRequest request) {
        User owner = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
        String suffix = draftSuffix();
        String name = defaultIfBlank(request.name(), "Untitled Group " + suffix);
        String seriesCode = defaultIfBlank(request.seriesCode(), "GRP-" + suffix).toUpperCase(Locale.ROOT);
        if (groupRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A group with this name already exists.");
        }
        if (groupRepository.existsBySeriesCodeIgnoreCase(seriesCode)) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A group with this series code already exists.");
        }
        BusinessGroup group = new BusinessGroup(owner, name, seriesCode,
                request.active() == null || request.active());
        return GroupResponse.from(groupRepository.save(group));
    }

    @Transactional
    public GroupResponse update(UUID userId, UUID groupId, CreateGroupRequest request) {
        userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
        BusinessGroup group = requireGroup(groupId);
        String name = defaultIfBlank(request.name(), group.getName());
        String seriesCode = defaultIfBlank(request.seriesCode(), group.getSeriesCode()).toUpperCase(Locale.ROOT);
        if (groupRepository.existsByNameIgnoreCaseAndIdNot(name, groupId)) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A group with this name already exists.");
        }
        if (groupRepository.existsBySeriesCodeIgnoreCaseAndIdNot(seriesCode, groupId)) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A group with this series code already exists.");
        }
        group.setName(name);
        group.setSeriesCode(seriesCode);
        group.setActive(request.active() == null ? group.isActive() : request.active());
        return GroupResponse.from(groupRepository.save(group));
    }

    @Transactional
    public void delete(UUID groupId) {
        BusinessGroup group = requireGroup(groupId);
        entityRepository.clearBusinessGroup(group);
        groupRepository.delete(group);
    }

    private BusinessGroup requireGroup(UUID groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found."));
    }

    private String draftSuffix() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
