package com.customreporting.entity.service;

import com.customreporting.entity.dto.EntityConfigurationDtos.*;
import com.customreporting.entity.model.*;
import com.customreporting.entity.repository.*;
import com.customreporting.exception.*;
import com.customreporting.security.CredentialCipher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class EntityConfigurationService {
    private final EntityService entityService;
    private final BranchRepository branchRepository;
    private final GstinRegistrationRepository gstinRepository;
    private final EntityBookRepository bookRepository;
    private final CredentialCipher credentialCipher;
    private final ZohoTokenService zohoTokenService;

    public EntityConfigurationService(EntityService entityService, BranchRepository branchRepository,
                                      GstinRegistrationRepository gstinRepository,
                                      EntityBookRepository bookRepository, CredentialCipher credentialCipher,
                                      ZohoTokenService zohoTokenService) {
        this.entityService = entityService;
        this.branchRepository = branchRepository;
        this.gstinRepository = gstinRepository;
        this.bookRepository = bookRepository;
        this.credentialCipher = credentialCipher;
        this.zohoTokenService = zohoTokenService;
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> branches(UUID entityId) {
        return branchRepository.findByReportingEntityAndArchivedAtIsNullOrderByNameAsc(entityService.requireEntity(entityId))
                .stream().map(BranchResponse::from).toList();
    }

    @Transactional
    public BranchResponse createBranch(UUID entityId, BranchRequest request) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        String suffix = draftSuffix();
        String code = normaliseCode(defaultIfBlank(request.code(), "BR-" + suffix));
        requireUniqueBranchCode(entity, code, null);
        Branch branch = new Branch(entity, defaultIfBlank(request.name(), "Untitled Branch " + suffix), code);
        applyBranch(branch, request);
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public BranchResponse updateBranch(UUID entityId, UUID branchId, BranchRequest request) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        Branch branch = requireBranch(entity, branchId);
        String code = normaliseCode(defaultIfBlank(request.code(), branch.getCode()));
        requireUniqueBranchCode(entity, code, branchId);
        branch.setName(defaultIfBlank(request.name(), branch.getName()));
        branch.setCode(code);
        applyBranch(branch, request);
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public BranchResponse changeBranchStatus(UUID entityId, UUID id, boolean active) {
        Branch branch = requireBranch(entityService.requireEntity(entityId), id);
        branch.setActive(active);
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public void archiveBranch(UUID entityId, UUID id) {
        Branch branch = requireBranch(entityService.requireEntity(entityId), id);
        branch.archive();
        branchRepository.save(branch);
    }

    @Transactional(readOnly = true)
    public List<GstinResponse> gstins(UUID entityId) {
        return gstinRepository.findByReportingEntityAndArchivedAtIsNullOrderByGstinAsc(entityService.requireEntity(entityId))
                .stream().map(GstinResponse::from).toList();
    }

    @Transactional
    public GstinResponse createGstin(UUID entityId, GstinRequest request) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        String gstin = normaliseGstin(request.gstin(), null);
        if (!gstin.startsWith("DRAFT-")) requireValidStateCode(gstin);
        if (gstinRepository.existsByGstinIgnoreCaseAndArchivedAtIsNull(gstin)) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION, "This GSTIN is already configured.");
        }
        GstinRegistration registration = new GstinRegistration(entity, gstin);
        applyGstin(entity, registration, request);
        return GstinResponse.from(gstinRepository.save(registration));
    }

    @Transactional
    public GstinResponse updateGstin(UUID entityId, UUID gstinId, GstinRequest request) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        GstinRegistration registration = requireGstin(entity, gstinId);
        String gstin = normaliseGstin(request.gstin(), registration.getGstin());
        if (!gstin.startsWith("DRAFT-")) requireValidStateCode(gstin);
        if (gstinRepository.existsByGstinIgnoreCaseAndArchivedAtIsNullAndIdNot(gstin, gstinId)) {
            throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION, "This GSTIN is already configured.");
        }
        registration.setGstin(gstin);
        applyGstin(entity, registration, request);
        return GstinResponse.from(gstinRepository.save(registration));
    }

    @Transactional
    public GstinResponse changeGstinStatus(UUID entityId, UUID id, boolean active) {
        GstinRegistration value = requireGstin(entityService.requireEntity(entityId), id);
        value.setActive(active);
        return GstinResponse.from(gstinRepository.save(value));
    }

    @Transactional
    public void archiveGstin(UUID entityId, UUID id) {
        GstinRegistration value = requireGstin(entityService.requireEntity(entityId), id);
        value.archive();
        gstinRepository.save(value);
    }

    @Transactional(readOnly = true)
    public List<BookResponse> books(UUID entityId) {
        return bookRepository.findByReportingEntityAndArchivedAtIsNullOrderByNameAsc(entityService.requireEntity(entityId))
                .stream().map(BookResponse::from).toList();
    }

    @Transactional
    public BookResponse createBook(UUID entityId, BookRequest request) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        EntityBook book = new EntityBook(entity, defaultIfBlank(request.name(), "Untitled Book " + draftSuffix()),
                request.source() == null ? BookSource.TALLY : request.source());
        applyBook(entity, book, request);
        return BookResponse.from(bookRepository.save(book));
    }

    @Transactional
    public BookResponse updateBook(UUID entityId, UUID bookId, BookRequest request) {
        ReportingEntity entity = entityService.requireEntity(entityId);
        EntityBook book = requireBook(entity, bookId);
        book.setName(defaultIfBlank(request.name(), book.getName()));
        book.setSource(request.source() == null ? book.getSource() : request.source());
        applyBook(entity, book, request);
        return BookResponse.from(bookRepository.save(book));
    }

    @Transactional
    public BookResponse changeBookStatus(UUID entityId, UUID id, boolean active) {
        EntityBook book = requireBook(entityService.requireEntity(entityId), id);
        book.setActive(active);
        return BookResponse.from(bookRepository.save(book));
    }

    @Transactional
    public void archiveBook(UUID entityId, UUID id) {
        EntityBook book = requireBook(entityService.requireEntity(entityId), id);
        book.archive();
        bookRepository.save(book);
    }

    private void applyBranch(Branch branch, BranchRequest request) {
        if (request.primaryBranch()) {
            branchRepository.findByReportingEntityAndPrimaryBranchTrueAndArchivedAtIsNull(branch.getReportingEntity())
                    .filter(existing -> !existing.getId().equals(branch.getId()))
                    .ifPresent(existing -> existing.setPrimaryBranch(false));
        }
        branch.setPrimaryBranch(request.primaryBranch());
        branch.setActive(request.active());
    }

    private void applyGstin(ReportingEntity entity, GstinRegistration value, GstinRequest request) {
        value.setStateName(defaultIfBlank(request.stateName(), "Not specified"));
        value.setRegistrationType(request.registrationType() == null ? RegistrationType.REGULAR : request.registrationType());
        value.setGstnUsername(trimToNull(request.gstnUsername()));
        if (request.gstnPassword() != null && !request.gstnPassword().isBlank()) {
            value.setGstnPasswordEncrypted(credentialCipher.encrypt(request.gstnPassword()));
        }
        value.setLinkedBook(request.linkedBookId() == null ? null : requireBook(entity, request.linkedBookId()));
        value.setLinkedBranch(request.linkedBranchId() == null ? null : requireBranch(entity, request.linkedBranchId()));
        value.setActive(request.active());
        value.setEInvoiceApplicable(request.eInvoiceApplicable());
    }

    private void applyBook(ReportingEntity entity, EntityBook book, BookRequest request) {
        if (request.primaryBook()) {
            bookRepository.findByReportingEntityAndPrimaryBookTrueAndArchivedAtIsNull(entity)
                    .filter(existing -> !existing.getId().equals(book.getId()))
                    .ifPresent(existing -> existing.setPrimaryBook(false));
        }
        book.setPrimaryBook(request.primaryBook());
        book.setActive(request.active());
        if (book.getSource() == BookSource.TALLY) {
            book.setTallyCompanyName(trimToNull(request.tallyCompanyName()));
            book.setTallyHost(defaultIfBlank(request.tallyHost(), "localhost"));
            book.setTallyPort(request.tallyPort() == null ? 9000 : request.tallyPort());
        } else {
            book.setZohoClientId(trimToNull(request.clientId()));
            if (request.clientSecret() != null && !request.clientSecret().isBlank()) {
                book.setZohoClientSecretEncrypted(credentialCipher.encrypt(request.clientSecret()));
            }
            book.setZohoAccountsDomain(trimToNull(request.accountsDomain()));
            book.setZohoApiDomain(trimToNull(request.apiDomain()));
            book.setZohoOrganizationId(trimToNull(request.organizationId()));
            book.setZohoOrganizationName(trimToNull(request.organizationName()));
            if (request.generateAndStoreToken()) {
                if (isBlank(request.clientId()) || isBlank(request.clientSecret()) ||
                        isBlank(request.accountsDomain()) || isBlank(request.generatedCode()) ||
                        isBlank(request.organizationId())) {
                    throw new BusinessRuleException("Enter all Zoho connection values before generating a token.");
                }
                ZohoTokenService.TokenResult tokens = zohoTokenService.exchange(request.accountsDomain().trim(),
                        request.clientId().trim(), request.clientSecret(), request.generatedCode().trim());
                book.setZohoAccessTokenEncrypted(credentialCipher.encrypt(tokens.accessToken()));
                book.setZohoRefreshTokenEncrypted(credentialCipher.encrypt(tokens.refreshToken()));
                book.setZohoTokenExpiresAt(tokens.expiresAt());
            }
        }
    }

    private void requireUniqueBranchCode(ReportingEntity entity, String code, UUID excluded) {
        boolean exists = excluded == null
                ? branchRepository.existsByReportingEntityAndCodeIgnoreCaseAndArchivedAtIsNull(entity, code)
                : branchRepository.existsByReportingEntityAndCodeIgnoreCaseAndArchivedAtIsNullAndIdNot(entity, code, excluded);
        if (exists) throw new DuplicateResourceException(ErrorCode.BUSINESS_RULE_VIOLATION,
                "This branch code is already used by the entity.");
    }

    private Branch requireBranch(ReportingEntity entity, UUID id) {
        return branchRepository.findByIdAndReportingEntityAndArchivedAtIsNull(id, entity)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found."));
    }
    private GstinRegistration requireGstin(ReportingEntity entity, UUID id) {
        return gstinRepository.findByIdAndReportingEntityAndArchivedAtIsNull(id, entity)
                .orElseThrow(() -> new ResourceNotFoundException("GSTIN not found."));
    }
    private EntityBook requireBook(ReportingEntity entity, UUID id) {
        return bookRepository.findByIdAndReportingEntityAndArchivedAtIsNull(id, entity)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found."));
    }
    private void requireValidStateCode(String gstin) {
        int code = Integer.parseInt(gstin.substring(0, 2));
        if (code < 1 || code > 38 || code == 25 || code == 26 || code == 34 || code == 35) {
            throw new BusinessRuleException("The GSTIN contains an unsupported state code.");
        }
    }
    private String normaliseCode(String value) { return value.trim().toUpperCase(Locale.ROOT); }
    private String normaliseGstin(String value, String fallback) {
        if (!isBlank(value)) return value.trim().toUpperCase(Locale.ROOT);
        return fallback == null ? "DRAFT-" + draftSuffix() : fallback;
    }
    private String draftSuffix() { return UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT); }
    private String trimToNull(String value) { return isBlank(value) ? null : value.trim(); }
    private String defaultIfBlank(String value, String fallback) { return isBlank(value) ? fallback : value.trim(); }
    private boolean isBlank(String value) { return value == null || value.isBlank(); }
}
