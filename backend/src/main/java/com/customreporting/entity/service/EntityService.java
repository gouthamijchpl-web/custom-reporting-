package com.customreporting.entity.service;

import com.customreporting.businessgroup.model.BusinessGroup;
import com.customreporting.businessgroup.repository.BusinessGroupRepository;
import com.customreporting.entity.dto.CreateEntityRequest;
import com.customreporting.entity.dto.EntityListResponse;
import com.customreporting.entity.dto.EntityResponse;
import com.customreporting.entity.dto.UpdateEntityRequest;
import com.customreporting.entity.model.EntitySelection;
import com.customreporting.entity.model.Branch;
import com.customreporting.entity.model.ReportingEntity;
import com.customreporting.entity.repository.EntitySelectionRepository;
import com.customreporting.entity.repository.BranchRepository;
import com.customreporting.entity.repository.ReportingEntityRepository;
import com.customreporting.security.CredentialCipher;
import com.customreporting.exception.BusinessRuleException;
import com.customreporting.exception.DuplicateResourceException;
import com.customreporting.exception.ErrorCode;
import com.customreporting.exception.ResourceNotFoundException;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Management of the entities an account reports on, and which of them is active.
 *
 * <p>Every operation takes the signed-in user's id and resolves the entity through it, so
 * an identifier belonging to another account simply does not resolve.</p>
 */
@Service
public class EntityService {

    private static final Logger log = LoggerFactory.getLogger(EntityService.class);

    private final ReportingEntityRepository entityRepository;
    private final EntitySelectionRepository selectionRepository;
    private final UserRepository userRepository;
    private final CredentialCipher credentialCipher;
    private final BusinessGroupRepository groupRepository;
    private final BranchRepository branchRepository;

    public EntityService(ReportingEntityRepository entityRepository,
                         EntitySelectionRepository selectionRepository,
                         UserRepository userRepository,
                         CredentialCipher credentialCipher,
                         BusinessGroupRepository groupRepository,
                         BranchRepository branchRepository) {
        this.entityRepository = entityRepository;
        this.selectionRepository = selectionRepository;
        this.userRepository = userRepository;
        this.credentialCipher = credentialCipher;
        this.groupRepository = groupRepository;
        this.branchRepository = branchRepository;
    }

    @Transactional
    public EntityListResponse list(UUID userId) {
        User user = requireUser(userId);
        List<EntityResponse> entities = entityRepository.findByArchivedAtIsNullOrderByNameAsc().stream()
                .map(EntityResponse::from)
                .toList();

        return new EntityListResponse(entities, currentSelectionId(user));
    }

    /**
     * Creates an entity. The first one an account creates becomes active immediately, so a
     * new user is never left with entities but nothing selected.
     */
    @Transactional
    public EntityResponse create(UUID userId, CreateEntityRequest request) {
        User user = requireUser(userId);

        String name = defaultIfBlank(request.name(), "Untitled Entity " + draftSuffix());
        String code = normaliseCode(request.code());
        requireUniqueName(user, name, null);
        requireUniqueCode(user, code, null);

        boolean isFirstEntity = entityRepository.countByArchivedAtIsNull() == 0;
        ReportingEntity entity = new ReportingEntity(user, name, code, trimToNull(request.description()));
        entity.setBusinessGroup(resolveGroup(request.groupId()));
        applyGstnCredentials(entity, request.primaryGstin(), request.gstnUsername(), request.gstnPassword());
        applyConfiguration(entity, request.pan(), request.primaryGstin(), request.tallyCompanyName(),
                defaultIfBlank(request.tallyHost(), "localhost"), request.tallyPort() == null ? 9000 : request.tallyPort(),
                request.active() == null || request.active(), request.multipleBranches(),
                request.eInvoiceEnabled(), request.eWayBillEnabled(), request.stockEnabled(),
                request.costCentreExtractionEnabled());
        ReportingEntity saved = entityRepository.save(entity);

        String primaryBranchName = trimToNull(request.primaryBranchName());
        if (primaryBranchName != null) {
            Branch branch = new Branch(saved, primaryBranchName,
                    code == null ? "BR-" + draftSuffix() : code + "-MAIN");
            branch.setPrimaryBranch(true);
            branch.setActive(saved.isActive());
            branchRepository.save(branch);
        }

        if (isFirstEntity && saved.isActive()) {
            selectionFor(user).setSelectedEntity(saved);
        }

        log.info("Account {} created entity {}", userId, saved.getId());
        return EntityResponse.from(saved);
    }

    @Transactional
    public EntityResponse update(UUID userId, UUID entityId, UpdateEntityRequest request) {
        requireUser(userId);
        ReportingEntity entity = requireEntity(entityId);

        String name = defaultIfBlank(request.name(), entity.getName());
        String code = normaliseCode(request.code());
        requireUniqueName(name, entity.getId());
        requireUniqueCode(code, entity.getId());

        entity.setName(name);
        entity.setCode(code);
        entity.setDescription(trimToNull(request.description()));
        if (request.groupId() != null) {
            entity.setBusinessGroup(resolveGroup(request.groupId()));
        }
        applyGstnCredentials(entity, request.primaryGstin(), request.gstnUsername(), request.gstnPassword());
        applyConfiguration(entity, request.pan(), request.primaryGstin(), request.tallyCompanyName(),
                defaultIfBlank(request.tallyHost(), entity.getTallyHost()),
                request.tallyPort() == null ? entity.getTallyPort() : request.tallyPort(),
                request.active() == null ? entity.isActive() : request.active(), request.multipleBranches(),
                request.eInvoiceEnabled(), request.eWayBillEnabled(), request.stockEnabled(),
                request.costCentreExtractionEnabled());

        // An entity that is no longer in use should not stay selected. Compared by
        // identifier because the association may be a lazy proxy rather than the instance.
        if (Boolean.FALSE.equals(request.active())) {
            selectionRepository.clearSelectionsOf(entity);
        }

        return EntityResponse.from(entityRepository.save(entity));
    }

    /**
     * Removes an entity. Any account whose selection pointed at it is cleared first, so no
     * dangling reference is left behind.
     */
    @Transactional
    public void delete(UUID userId, UUID entityId) {
        requireUser(userId);
        ReportingEntity entity = requireEntity(entityId);

        selectionRepository.clearSelectionsOf(entity);
        entity.archive();
        entityRepository.save(entity);
        log.info("Account {} archived entity {}", userId, entityId);
    }

    @Transactional(readOnly = true)
    public EntityResponse get(UUID userId, UUID entityId) {
        requireUser(userId);
        return EntityResponse.from(requireEntity(entityId));
    }

    @Transactional
    public EntityResponse changeStatus(UUID userId, UUID entityId, boolean active) {
        requireUser(userId);
        ReportingEntity entity = requireEntity(entityId);
        entity.setActive(active);
        if (!active) {
            selectionRepository.clearSelectionsOf(entity);
        }
        return EntityResponse.from(entityRepository.save(entity));
    }

    /** Makes an entity active for the account. */
    @Transactional
    public EntityListResponse select(UUID userId, UUID entityId) {
        User user = requireUser(userId);
        ReportingEntity entity = requireEntity(entityId);

        if (!entity.isActive()) {
            throw new BusinessRuleException("This entity is inactive and cannot be selected.");
        }

        selectionFor(user).setSelectedEntity(entity);
        return list(userId);
    }

    // ---------------------------------------------------------------- helpers

    /** Lazily creates the selection row the first time an account needs one. */
    private EntitySelection selectionFor(User user) {
        return selectionRepository.findByUser(user)
                .orElseGet(() -> selectionRepository.save(new EntitySelection(user)));
    }

    private UUID currentSelectionId(User user) {
        return selectionRepository.findByUser(user)
                .map(EntitySelection::getSelectedEntity)
                .map(ReportingEntity::getId)
                .orElse(null);
    }

    private void requireUniqueName(User owner, String name, UUID excludedId) {
        requireUniqueName(name, excludedId);
    }

    private void requireUniqueName(String name, UUID excludedId) {
        boolean taken = excludedId == null
                ? entityRepository.existsByNameIgnoreCaseAndArchivedAtIsNull(name)
                : entityRepository.existsByNameIgnoreCaseAndArchivedAtIsNullAndIdNot(name, excludedId);

        if (taken) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "You already have an entity with this name.");
        }
    }

    private void requireUniqueCode(User owner, String code, UUID excludedId) {
        requireUniqueCode(code, excludedId);
    }

    private void requireUniqueCode(String code, UUID excludedId) {
        if (code == null) {
            return;
        }
        boolean taken = excludedId == null
                ? entityRepository.existsByCodeIgnoreCaseAndArchivedAtIsNull(code)
                : entityRepository.existsByCodeIgnoreCaseAndArchivedAtIsNullAndIdNot(code, excludedId);

        if (taken) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "You already have an entity with this code.");
        }
    }

    public ReportingEntity requireEntity(UUID entityId) {
        return entityRepository.findByIdAndArchivedAtIsNull(entityId)
                .orElseThrow(() -> new ResourceNotFoundException("Entity not found."));
    }

    private void applyConfiguration(ReportingEntity entity, String pan, String primaryGstin,
                                    String tallyCompanyName, String tallyHost, int tallyPort,
                                    boolean active, boolean multipleBranches, boolean eInvoiceEnabled,
                                    boolean eWayBillEnabled, boolean stockEnabled,
                                    boolean costCentreExtractionEnabled) {
        entity.setPan(upperOrNull(pan));
        entity.setPrimaryGstin(upperOrNull(primaryGstin));
        entity.setTallyCompanyName(trimToNull(tallyCompanyName));
        entity.setTallyHost(tallyHost.trim());
        entity.setTallyPort(tallyPort);
        entity.setActive(active);
        entity.setMultipleBranches(multipleBranches);
        entity.setEInvoiceEnabled(eInvoiceEnabled);
        entity.setEWayBillEnabled(eWayBillEnabled);
        entity.setStockEnabled(stockEnabled);
        entity.setCostCentreExtractionEnabled(costCentreExtractionEnabled);
    }

    private void applyGstnCredentials(ReportingEntity entity, String primaryGstin,
                                      String username, String password) {
        boolean hasCredentials = (username != null && !username.isBlank())
                || (password != null && !password.isBlank());
        if (hasCredentials && (primaryGstin == null || primaryGstin.isBlank())) {
            throw new BusinessRuleException("Enter the Primary GSTIN before adding GSTIN credentials.");
        }
        entity.setGstnUsername(trimToNull(username));
        if (password != null && !password.isBlank()) {
            entity.setGstnPasswordEncrypted(credentialCipher.encrypt(password));
        }
    }

    private String upperOrNull(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
    }

    private BusinessGroup resolveGroup(UUID groupId) {
        if (groupId == null) return null;
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found."));
    }

    private String normaliseCode(String code) {
        String trimmed = trimToNull(code);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String draftSuffix() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }
}
