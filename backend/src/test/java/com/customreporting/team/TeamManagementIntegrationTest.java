package com.customreporting.team;

import com.customreporting.auth.repository.PasswordResetTokenRepository;
import com.customreporting.auth.repository.RefreshTokenRepository;
import com.customreporting.entity.repository.EntitySelectionRepository;
import com.customreporting.entity.repository.ReportingEntityRepository;
import com.customreporting.exception.ErrorCode;
import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers team management end to end: who may use it, the rules that stop an administrator
 * locking everybody out, and the link between team access and being able to sign in.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TeamManagementIntegrationTest {

    private static final String ADMIN_EMAIL = "founder@example.com";
    private static final String PASSWORD = "Str0ngPassw0rd";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private EntitySelectionRepository entitySelectionRepository;

    @Autowired
    private ReportingEntityRepository reportingEntityRepository;

    private String adminToken;

    @BeforeEach
    void createFounder() throws Exception {
        entitySelectionRepository.deleteAll();
        reportingEntityRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        userRepository.deleteAll();

        // The first account to register becomes the administrator.
        signUp("Founder", ADMIN_EMAIL, PASSWORD);
        adminToken = signIn(ADMIN_EMAIL, PASSWORD);
    }

    // ---------------------------------------------------------------- bootstrap

    @Test
    @DisplayName("the first account registered becomes an active administrator")
    void firstAccountBecomesAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.accessStatus").value("ACTIVE"));
    }

    @Test
    @DisplayName("later self-registered accounts are pending and cannot sign in")
    void laterSignupsArePending() throws Exception {
        mockMvc.perform(signUpRequest("Second Person", "second@example.com", PASSWORD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessStatus").value("PENDING"))
                .andExpect(jsonPath("$.role").value("USER"));

        mockMvc.perform(loginRequest("second@example.com", PASSWORD))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(ErrorCode.ACCESS_PENDING));
    }

    // ---------------------------------------------------------------- authorisation

    @Test
    @DisplayName("team endpoints reject anonymous callers")
    void teamEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/team/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHENTICATED));
    }

    @Test
    @DisplayName("an ordinary user is refused every team endpoint")
    void ordinaryUsersCannotManageTheTeam() throws Exception {
        String memberId = addMember("Regular Person", "regular@example.com", "USER", "PENDING");
        signUp("Regular Person", "regular@example.com", PASSWORD);
        String userToken = signIn("regular@example.com", PASSWORD);

        mockMvc.perform(get("/api/v1/team/users").header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(ErrorCode.ACCESS_DENIED));

        mockMvc.perform(addMemberRequest(userToken, "Someone", "someone@example.com", "ADMIN", "PENDING"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/v1/team/users/" + memberId + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(userToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("accessStatus", "INACTIVE"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/v1/team/users/" + memberId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("an owner can manage the team")
    void ownerCanManageTheTeam() throws Exception {
        addMember("Workspace Owner", "owner@example.com", "OWNER", "PENDING");
        signUp("Workspace Owner", "owner@example.com", PASSWORD);
        String ownerToken = signIn("owner@example.com", PASSWORD);

        mockMvc.perform(get("/api/v1/team/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
                .andExpect(status().isOk());

        mockMvc.perform(addMemberRequest(
                        ownerToken, "Owner Added Member", "owner-added@example.com", "USER", "PENDING"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("USER"));
    }

    // ---------------------------------------------------------------- adding

    @Test
    @DisplayName("an added member starts pending until they register")
    void addedMemberStartsPending() throws Exception {
        mockMvc.perform(addMemberRequest(adminToken, "Invited Person", "invited@example.com", "USER", "ACTIVE"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fullName").value("Invited Person"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.registered").value(false))
                // Active was requested, but access cannot precede registration.
                .andExpect(jsonPath("$.accessStatus").value("PENDING"));
    }

    @Test
    @DisplayName("registering with an invited address claims the invitation and its role")
    void signupClaimsInvitation() throws Exception {
        addMember("Invited Admin", "invited.admin@example.com", "ADMIN", "PENDING");

        mockMvc.perform(signUpRequest("Invited Admin", "invited.admin@example.com", PASSWORD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.accessStatus").value("ACTIVE"));

        // One account, not two.
        assertThat(userRepository.countByDeletedAtIsNull()).isEqualTo(2);
        mockMvc.perform(loginRequest("invited.admin@example.com", PASSWORD)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("duplicate and invalid payloads are rejected")
    void addMemberValidatesPayload() throws Exception {
        addMember("Invited Person", "invited@example.com", "USER", "PENDING");

        mockMvc.perform(addMemberRequest(adminToken, "Someone Else", "INVITED@example.com", "USER", "PENDING"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Someone with this email address is already on the team."));

        mockMvc.perform(addMemberRequest(adminToken, "X", "not-an-email", "USER", "PENDING"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_FAILED))
                .andExpect(jsonPath("$.fieldErrors.fullName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists());
    }

    // ---------------------------------------------------------------- access changes

    @Test
    @DisplayName("deactivating a member blocks sign-in; reactivating restores it")
    void deactivationBlocksSignIn() throws Exception {
        addMember("Regular Person", "regular@example.com", "USER", "PENDING");
        signUp("Regular Person", "regular@example.com", PASSWORD);
        String memberId = idOf("regular@example.com");

        mockMvc.perform(loginRequest("regular@example.com", PASSWORD)).andExpect(status().isOk());

        mockMvc.perform(changeStatus(adminToken, memberId, "INACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessStatus").value("INACTIVE"));

        mockMvc.perform(loginRequest("regular@example.com", PASSWORD))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(ErrorCode.ACCOUNT_DISABLED))
                .andExpect(jsonPath("$.message").value(
                        "Your access to this application is currently disabled. Please contact the administrator."));

        mockMvc.perform(changeStatus(adminToken, memberId, "ACTIVE")).andExpect(status().isOk());
        mockMvc.perform(loginRequest("regular@example.com", PASSWORD)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("deactivating a member invalidates the access token they already hold")
    void deactivationInvalidatesLiveTokens() throws Exception {
        addMember("Regular Person", "regular@example.com", "USER", "PENDING");
        signUp("Regular Person", "regular@example.com", PASSWORD);
        String userToken = signIn("regular@example.com", PASSWORD);

        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isOk());

        mockMvc.perform(changeStatus(adminToken, idOf("regular@example.com"), "INACTIVE"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("an unregistered invitation cannot be activated")
    void pendingInvitationCannotBeActivated() throws Exception {
        String memberId = addMember("Invited Person", "invited@example.com", "USER", "PENDING");

        mockMvc.perform(changeStatus(adminToken, memberId, "ACTIVE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("has not finished registering")));
    }

    // ---------------------------------------------------------------- protections

    @Test
    @DisplayName("an administrator cannot deactivate or delete their own account")
    void administratorCannotLockThemselvesOut() throws Exception {
        String selfId = idOf(ADMIN_EMAIL);

        mockMvc.perform(changeStatus(adminToken, selfId, "INACTIVE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("cannot deactivate your own account")));

        mockMvc.perform(delete("/api/v1/team/users/" + selfId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("cannot remove your own account")));
    }

    @Test
    @DisplayName("the only administrator cannot be demoted, deactivated or removed")
    void theLastAdministratorIsProtected() throws Exception {
        // A second administrator, so the founder is no longer the only one.
        addMember("Second Admin", "second.admin@example.com", "ADMIN", "PENDING");
        signUp("Second Admin", "second.admin@example.com", PASSWORD);
        String secondAdminToken = signIn("second.admin@example.com", PASSWORD);
        String founderId = idOf(ADMIN_EMAIL);

        // With two administrators, demoting one is allowed.
        mockMvc.perform(updateMember(secondAdminToken, founderId, "Founder", "USER", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("USER"));

        // Now only one administrator remains and the protections apply.
        String secondAdminId = idOf("second.admin@example.com");
        mockMvc.perform(updateMember(secondAdminToken, secondAdminId, "Second Admin", "USER", "ACTIVE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("without one")));
    }

    // ---------------------------------------------------------------- removal

    @Test
    @DisplayName("removing a member keeps the record and blocks sign-in")
    void removalIsASoftDelete() throws Exception {
        addMember("Regular Person", "regular@example.com", "USER", "PENDING");
        signUp("Regular Person", "regular@example.com", PASSWORD);
        String memberId = idOf("regular@example.com");

        mockMvc.perform(delete("/api/v1/team/users/" + memberId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User removed successfully."));

        // The row survives, so anything attributed to them stays attributable.
        User removed = userRepository.findByEmail("regular@example.com").orElseThrow();
        assertThat(removed.isDeleted()).isTrue();
        assertThat(removed.getFullName()).isEqualTo("Regular Person");

        mockMvc.perform(loginRequest("regular@example.com", PASSWORD)).andExpect(status().isForbidden());

        // And they no longer appear in the team.
        mockMvc.perform(get("/api/v1/team/users").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("re-adding a removed address restores the original record")
    void reAddingRestoresTheSameRecord() throws Exception {
        addMember("Regular Person", "regular@example.com", "USER", "PENDING");
        String originalId = idOf("regular@example.com");

        mockMvc.perform(delete("/api/v1/team/users/" + originalId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());

        mockMvc.perform(addMemberRequest(adminToken, "Regular Person", "regular@example.com", "USER", "PENDING"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(originalId));

        assertThat(userRepository.countByDeletedAtIsNull()).isEqualTo(2);
    }

    // ---------------------------------------------------------------- search and filter

    @Test
    @DisplayName("the list can be searched by name or email and filtered by role and status")
    void listSupportsSearchAndFilters() throws Exception {
        addMember("Alice Archer", "alice@example.com", "USER", "PENDING");
        addMember("Bob Baker", "bob@example.com", "ADMIN", "PENDING");

        mockMvc.perform(listRequest("?search=alice"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].email").value("alice@example.com"));

        mockMvc.perform(listRequest("?search=BOB@EXAMPLE"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].fullName").value("Bob Baker"));

        mockMvc.perform(listRequest("?role=ADMIN"))
                .andExpect(jsonPath("$.length()").value(2)); // the founder and Bob

        mockMvc.perform(listRequest("?status=PENDING"))
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(listRequest("?role=USER&status=PENDING"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].email").value("alice@example.com"));
    }

    @Test
    @DisplayName("the caller's own row is marked, so the interface can disable self-actions")
    void ownRowIsMarked() throws Exception {
        mockMvc.perform(listRequest(""))
                .andExpect(jsonPath("$[0].email").value(ADMIN_EMAIL))
                .andExpect(jsonPath("$[0].self").value(true));
    }

    // ---------------------------------------------------------------- helpers

    private MockHttpServletRequestBuilder listRequest(String query) {
        return get("/api/v1/team/users" + query).header(HttpHeaders.AUTHORIZATION, bearer(adminToken));
    }

    private String addMember(String name, String email, String role, String status) throws Exception {
        String body = mockMvc.perform(addMemberRequest(adminToken, name, email, role, status))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asText();
    }

    private MockHttpServletRequestBuilder addMemberRequest(String token, String name, String email,
                                                           String role, String status) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("fullName", name);
        payload.put("email", email);
        payload.put("role", role);
        payload.put("accessStatus", status);

        return post("/api/v1/team/users")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(payload));
    }

    private MockHttpServletRequestBuilder updateMember(String token, String memberId, String name,
                                                       String role, String status) throws Exception {
        return put("/api/v1/team/users/" + memberId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("fullName", name, "role", role, "accessStatus", status)));
    }

    private MockHttpServletRequestBuilder changeStatus(String token, String memberId, String status)
            throws Exception {
        return patch("/api/v1/team/users/" + memberId + "/status")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("accessStatus", status)));
    }

    private void signUp(String name, String email, String password) throws Exception {
        mockMvc.perform(signUpRequest(name, email, password)).andExpect(status().isCreated());
    }

    private MockHttpServletRequestBuilder signUpRequest(String name, String email, String password)
            throws Exception {
        return post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "fullName", name, "email", email,
                        "password", password, "confirmPassword", password)));
    }

    private String signIn(String email, String password) throws Exception {
        String body = mockMvc.perform(loginRequest(email, password))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private MockHttpServletRequestBuilder loginRequest(String email, String password) throws Exception {
        return post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", email, "password", password, "rememberMe", false)));
    }

    private String idOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId().toString();
    }

    private String json(Object payload) throws Exception {
        return objectMapper.writeValueAsString(payload);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
