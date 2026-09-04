package com.customreporting.entity;

import com.customreporting.auth.repository.PasswordResetTokenRepository;
import com.customreporting.auth.repository.RefreshTokenRepository;
import com.customreporting.businessgroup.repository.BusinessGroupRepository;
import com.customreporting.entity.repository.EntitySelectionRepository;
import com.customreporting.entity.repository.ReportingEntityRepository;
import com.customreporting.entity.repository.BranchRepository;
import com.customreporting.entity.repository.EntityBookRepository;
import com.customreporting.entity.repository.GstinRegistrationRepository;
import com.customreporting.settings.repository.WorkspaceConfigurationRepository;
import com.customreporting.exception.ErrorCode;
import com.customreporting.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the entity resource: creation, uniqueness, selection, deletion, and the isolation
 * that keeps one account's entities invisible to another.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EntityModuleIntegrationTest {

    private static final String PASSWORD = "Str0ngPassw0rd";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReportingEntityRepository entityRepository;

    @Autowired
    private EntitySelectionRepository selectionRepository;

    @Autowired private BranchRepository branchRepository;
    @Autowired private GstinRegistrationRepository gstinRepository;
    @Autowired private EntityBookRepository bookRepository;
    @Autowired private WorkspaceConfigurationRepository workspaceRepository;
    @Autowired private BusinessGroupRepository groupRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @BeforeEach
    void reset() {
        selectionRepository.deleteAll();
        gstinRepository.deleteAll();
        branchRepository.deleteAll();
        bookRepository.deleteAll();
        entityRepository.deleteAll();
        groupRepository.deleteAll();
        workspaceRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("an administrator can configure workspace, branches, books and GSTINs")
    void configuresTheEntityHierarchy() throws Exception {
        String token = registerAndSignIn("ada@example.com");
        String entityId = createEntity(token, "Acme Pvt Ltd", "ACME");

        mockMvc.perform(put("/api/v1/entities/" + entityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Acme Pvt Ltd", "code", "ACME",
                                "primaryGstin", "29ABCDE1234F1Z5", "gstnUsername", "acme.gstn",
                                "gstnPassword", "encrypted-at-rest", "active", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gstnUsername").value("acme.gstn"))
                .andExpect(jsonPath("$.gstnPasswordConfigured").value(true))
                .andExpect(jsonPath("$.gstnPassword").doesNotExist());

        mockMvc.perform(put("/api/v1/settings/workspace")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "India Reporting", "code", "INDIA", "description", "Primary workspace",
                                "active", true, "defaultCurrency", "INR", "timeZone", "Asia/Kolkata"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("INDIA"));

        String bookBody = mockMvc.perform(post("/api/v1/entities/" + entityId + "/books")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Main Books", "source", "TALLY", "primaryBook", true,
                                "active", true, "tallyHost", "localhost", "tallyPort", 9000,
                                "generateAndStoreToken", false))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.primaryBook").value(true))
                .andReturn().getResponse().getContentAsString();
        String bookId = objectMapper.readTree(bookBody).get("id").asText();

        String branchBody = mockMvc.perform(post("/api/v1/entities/" + entityId + "/branches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Bengaluru", "code", "BLR01", "primaryBranch", true, "active", true))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("BLR01"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchBody).get("id").asText();

        mockMvc.perform(post("/api/v1/entities/" + entityId + "/gstins")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("gstin", "29ABCDE1234F1Z5", "linkedBookId", bookId,
                                "linkedBranchId", branchId,
                                "stateName", "Karnataka", "registrationType", "REGULAR", "gstnUsername", "acme.gstn",
                                "gstnPassword", "not-returned", "active", true, "eInvoiceApplicable", true))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.linkedBranchId").value(branchId))
                .andExpect(jsonPath("$.linkedBranchName").value("Bengaluru"))
                .andExpect(jsonPath("$.passwordConfigured").value(true))
                .andExpect(jsonPath("$.gstnPassword").doesNotExist());

        mockMvc.perform(get("/api/v1/entities/" + entityId + "/gstins")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].linkedBookName").value("Main Books"))
                .andExpect(jsonPath("$[0].gstnPassword").doesNotExist());
    }

    @Test
    @DisplayName("management records can be saved with optional fields left blank")
    void createsDraftManagementRecordsFromBlankForms() throws Exception {
        String token = registerAndSignIn("ada@example.com");

        mockMvc.perform(post("/api/v1/groups")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"seriesCode\":\"\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(org.hamcrest.Matchers.startsWith("Untitled Group ")))
                .andExpect(jsonPath("$.seriesCode").value(org.hamcrest.Matchers.startsWith("GRP-")));

        String entityBody = mockMvc.perform(createRequest(token, "", ""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(org.hamcrest.Matchers.startsWith("Untitled Entity ")))
                .andExpect(jsonPath("$.code").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String entityId = objectMapper.readTree(entityBody).get("id").asText();

        mockMvc.perform(post("/api/v1/entities/" + entityId + "/branches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(org.hamcrest.Matchers.startsWith("Untitled Branch ")))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.startsWith("BR-")));

        mockMvc.perform(post("/api/v1/entities/" + entityId + "/books")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(org.hamcrest.Matchers.startsWith("Untitled Book ")))
                .andExpect(jsonPath("$.source").value("TALLY"))
                .andExpect(jsonPath("$.tallyHost").value("localhost"))
                .andExpect(jsonPath("$.tallyPort").value(9000));

        mockMvc.perform(post("/api/v1/entities/" + entityId + "/gstins")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.gstin").value(org.hamcrest.Matchers.startsWith("DRAFT-")))
                .andExpect(jsonPath("$.stateName").value("Not specified"))
                .andExpect(jsonPath("$.registrationType").value("REGULAR"));
    }

    @Test
    @DisplayName("the entity list requires authentication")
    void listRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/entities"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHENTICATED));
    }

    @Test
    @DisplayName("a new account starts with no entities and no selection")
    void newAccountStartsEmpty() throws Exception {
        String token = registerAndSignIn("ada@example.com");

        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entities").isEmpty())
                .andExpect(jsonPath("$.selectedEntityId").doesNotExist());
    }

    @Test
    @DisplayName("the first entity created becomes the active one")
    void firstEntityIsSelectedAutomatically() throws Exception {
        String token = registerAndSignIn("ada@example.com");
        String entityId = createEntity(token, "Acme Pvt Ltd", "ACME");

        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entities.length()").value(1))
                .andExpect(jsonPath("$.entities[0].name").value("Acme Pvt Ltd"))
                .andExpect(jsonPath("$.entities[0].code").value("ACME"))
                .andExpect(jsonPath("$.selectedEntityId").value(entityId));

        // A second entity does not steal the selection.
        createEntity(token, "Bharat Industries", "BHRT");
        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.entities.length()").value(2))
                .andExpect(jsonPath("$.selectedEntityId").value(entityId));
    }

    @Test
    @DisplayName("entity names and codes are unique in the workspace, ignoring case")
    void namesAndCodesAreUniquePerAccount() throws Exception {
        String token = registerAndSignIn("ada@example.com");
        createEntity(token, "Acme Pvt Ltd", "ACME");

        mockMvc.perform(createRequest(token, "acme pvt ltd", "OTHER"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("You already have an entity with this name."));

        mockMvc.perform(createRequest(token, "Different Name", "acme"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("You already have an entity with this code."));

        // Ordinary workspace members can create records, but workspace uniqueness still applies.
        String otherToken = registerAndSignIn("grace@example.com");
        mockMvc.perform(createRequest(otherToken, "Acme Pvt Ltd", "ACME"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("invalid optional values are rejected with field errors")
    void createValidatesPayload() throws Exception {
        String token = registerAndSignIn("ada@example.com");

        mockMvc.perform(createRequest(token, "A".repeat(121), "not valid!"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_FAILED))
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.code").exists());
    }

    @Test
    @DisplayName("selecting an entity makes it the active one")
    void selectionSwitchesTheActiveEntity() throws Exception {
        String token = registerAndSignIn("ada@example.com");
        createEntity(token, "Acme Pvt Ltd", "ACME");
        String second = createEntity(token, "Bharat Industries", "BHRT");

        mockMvc.perform(put("/api/v1/entities/selection")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityId", second))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectedEntityId").value(second));
    }

    @Test
    @DisplayName("workspace members can create and edit records but only administrators can delete them")
    void workspaceMembersCanCreateAndEditButCannotDelete() throws Exception {
        String ownerToken = registerAndSignIn("ada@example.com");
        String entityId = createEntity(ownerToken, "Acme Pvt Ltd", "ACME");

        String memberToken = registerAndSignIn("grace@example.com");

        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entities.length()").value(1))
                .andExpect(jsonPath("$.entities[0].id").value(entityId));

        createEntity(memberToken, "Member Created Entity", "MEMBER");

        mockMvc.perform(put("/api/v1/entities/" + entityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Acme Updated By Member", "code", "ACME", "active", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Acme Updated By Member"));

        String groupBody = mockMvc.perform(post("/api/v1/groups")
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Member Group", "seriesCode", "MEM-GRP", "active", true))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String groupId = objectMapper.readTree(groupBody).get("id").asText();

        mockMvc.perform(put("/api/v1/groups/" + groupId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Member Group Updated", "seriesCode", "MEM-GRP", "active", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Member Group Updated"));

        String branchBody = mockMvc.perform(post("/api/v1/entities/" + entityId + "/branches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Member Branch", "code", "MB01", "primaryBranch", false, "active", true))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchBody).get("id").asText();

        mockMvc.perform(put("/api/v1/entities/" + entityId + "/branches/" + branchId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Member Branch Updated", "code", "MB01", "primaryBranch", false, "active", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Member Branch Updated"));

        String bookBody = mockMvc.perform(post("/api/v1/entities/" + entityId + "/books")
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Member Book", "source", "TALLY", "primaryBook", false,
                                "active", true, "tallyHost", "localhost", "tallyPort", 9000,
                                "generateAndStoreToken", false))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String bookId = objectMapper.readTree(bookBody).get("id").asText();

        mockMvc.perform(put("/api/v1/entities/" + entityId + "/books/" + bookId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Member Book Updated", "source", "TALLY", "primaryBook", false,
                                "active", true, "tallyHost", "localhost", "tallyPort", 9000,
                                "generateAndStoreToken", false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Member Book Updated"));

        String gstinBody = mockMvc.perform(post("/api/v1/entities/" + entityId + "/gstins")
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("gstin", "29ABCDE1234F1Z5", "linkedBookId", bookId,
                                "stateName", "Karnataka", "registrationType", "REGULAR",
                                "active", true, "eInvoiceApplicable", false))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String gstinId = objectMapper.readTree(gstinBody).get("id").asText();

        mockMvc.perform(put("/api/v1/entities/" + entityId + "/gstins/" + gstinId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("gstin", "29ABCDE1234F1Z5", "linkedBookId", bookId,
                                "stateName", "Karnataka Updated", "registrationType", "REGULAR",
                                "active", true, "eInvoiceApplicable", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stateName").value("Karnataka Updated"));

        mockMvc.perform(delete("/api/v1/entities/" + entityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/groups/" + groupId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/entities/" + entityId + "/branches/" + branchId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/entities/" + entityId + "/books/" + bookId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/entities/" + entityId + "/gstins/" + gstinId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
                .andExpect(status().isForbidden());

        // The administrator still sees both entities after the member's denied delete.
        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
                .andExpect(jsonPath("$.entities.length()").value(2));
    }

    @Test
    @DisplayName("renaming an entity keeps it selected")
    void updateRenamesWithoutLosingSelection() throws Exception {
        String token = registerAndSignIn("ada@example.com");
        String entityId = createEntity(token, "Acme Pvt Ltd", "ACME");

        Map<String, Object> payload = new HashMap<>();
        payload.put("name", "Acme Private Limited");
        payload.put("code", "ACME");
        payload.put("description", "Primary trading company");
        payload.put("active", true);

        mockMvc.perform(put("/api/v1/entities/" + entityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Acme Private Limited"))
                .andExpect(jsonPath("$.description").value("Primary trading company"));

        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.selectedEntityId").value(entityId));
    }

    @Test
    @DisplayName("deactivating the active entity clears the selection")
    void deactivatingClearsSelection() throws Exception {
        String token = registerAndSignIn("ada@example.com");
        String entityId = createEntity(token, "Acme Pvt Ltd", "ACME");

        Map<String, Object> payload = new HashMap<>();
        payload.put("name", "Acme Pvt Ltd");
        payload.put("code", "ACME");
        payload.put("description", null);
        payload.put("active", false);

        mockMvc.perform(put("/api/v1/entities/" + entityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(payload)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.selectedEntityId").doesNotExist());

        // An inactive entity cannot be selected again until it is reactivated.
        mockMvc.perform(put("/api/v1/entities/selection")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityId", entityId))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("deleting the active entity removes it and clears the selection")
    void deleteClearsSelection() throws Exception {
        String token = registerAndSignIn("ada@example.com");
        String entityId = createEntity(token, "Acme Pvt Ltd", "ACME");

        mockMvc.perform(delete("/api/v1/entities/" + entityId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/entities").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.entities").isEmpty())
                .andExpect(jsonPath("$.selectedEntityId").doesNotExist());
    }

    @Test
    @DisplayName("an unknown entity identifier is reported as not found")
    void unknownEntityIsNotFound() throws Exception {
        String token = registerAndSignIn("ada@example.com");

        mockMvc.perform(delete("/api/v1/entities/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ErrorCode.RESOURCE_NOT_FOUND));
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Registers an account and signs in with it.
     *
     * <p>Only the first account registered is granted access automatically; anyone after
     * that is left pending until an administrator approves them. These tests are about
     * entity isolation rather than access control, so subsequent accounts are activated
     * directly instead of going through the Teams API.</p>
     */
    private String registerAndSignIn(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "fullName", "Test Person",
                                "email", email,
                                "password", PASSWORD,
                                "confirmPassword", PASSWORD))))
                .andExpect(status().isCreated());

        userRepository.findByEmail(email).ifPresent(account -> {
            account.setAccessStatus(com.customreporting.user.AccessStatus.ACTIVE);
            userRepository.save(account);
        });

        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", PASSWORD, "rememberMe", false))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private String createEntity(String token, String name, String code) throws Exception {
        String body = mockMvc.perform(createRequest(token, name, code))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        return json.get("id").asText();
    }

    private MockHttpServletRequestBuilder createRequest(String token, String name, String code) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", name);
        payload.put("code", code);
        payload.put("description", null);

        return post("/api/v1/entities")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(payload));
    }

    private String json(Object payload) throws Exception {
        return objectMapper.writeValueAsString(payload);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
