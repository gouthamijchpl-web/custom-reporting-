package com.customreporting.auth;

import com.customreporting.auth.repository.PasswordResetTokenRepository;
import com.customreporting.auth.repository.RefreshTokenRepository;
import com.customreporting.exception.ErrorCode;
import com.customreporting.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end coverage of the authentication surface: registration, sign-in, session
 * rotation, access control and the settings endpoints that depend on a valid session.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest {

    private static final String EMAIL = "jordan.blake@example.com";
    private static final String PASSWORD = "Str0ngPassw0rd";
    private static final String REFRESH_COOKIE = "cr_refresh_token";

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

    /** Child rows reference the account, so they are cleared before the accounts are. */
    @BeforeEach
    void resetAccounts() {
        refreshTokenRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("registration stores the account and never returns the password")
    void signupCreatesAccount() throws Exception {
        mockMvc.perform(signupRequest("Jordan Blake", EMAIL, PASSWORD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.fullName").value("Jordan Blake"))
                // The first account registered becomes the administrator; see AuthService.register.
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.accessStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        assertThat(userRepository.existsByEmail(EMAIL)).isTrue();
    }

    @Test
    @DisplayName("email addresses are unique regardless of casing")
    void signupRejectsDuplicateEmail() throws Exception {
        mockMvc.perform(signupRequest("Jordan Blake", EMAIL, PASSWORD)).andExpect(status().isCreated());

        mockMvc.perform(signupRequest("Someone Else", EMAIL.toUpperCase(), PASSWORD))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.EMAIL_ALREADY_REGISTERED));
    }

    @Test
    @DisplayName("weak passwords and mismatched confirmations are rejected with field errors")
    void signupValidatesPayload() throws Exception {
        String payload = objectMapper.writeValueAsString(Map.of(
                "fullName", "J",
                "email", "not-an-email",
                "password", "weak",
                "confirmPassword", "different"));

        mockMvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_FAILED))
                .andExpect(jsonPath("$.fieldErrors.fullName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists())
                .andExpect(jsonPath("$.fieldErrors.confirmPassword").exists());
    }

    @Test
    @DisplayName("sign-in returns an access token and an httpOnly refresh cookie")
    void loginIssuesTokenAndCookie() throws Exception {
        registerTestUser();

        mockMvc.perform(loginRequest(EMAIL, PASSWORD, false))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value(EMAIL))
                .andExpect(cookie().exists(REFRESH_COOKIE))
                .andExpect(cookie().httpOnly(REFRESH_COOKIE, true));
    }

    @Test
    @DisplayName("a wrong password is reported without revealing whether the account exists")
    void loginRejectsWrongPassword() throws Exception {
        registerTestUser();

        mockMvc.perform(loginRequest(EMAIL, "Wr0ngPassword", false))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_CREDENTIALS))
                .andExpect(jsonPath("$.message").value("Incorrect email address or password."));

        mockMvc.perform(loginRequest("nobody@example.com", PASSWORD, false))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect email address or password."));
    }

    @Test
    @DisplayName("repeated failures lock the account")
    void repeatedFailuresLockTheAccount() throws Exception {
        registerTestUser();

        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(loginRequest(EMAIL, "Wr0ngPassword", false)).andExpect(status().isUnauthorized());
        }

        // Even the correct password is refused while the lock is in force.
        mockMvc.perform(loginRequest(EMAIL, PASSWORD, false))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value(ErrorCode.ACCOUNT_LOCKED));
    }

    @Test
    @DisplayName("protected endpoints reject requests without a valid token")
    void protectedEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHENTICATED));

        mockMvc.perform(get("/api/v1/settings/account").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/reports")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("the access token grants entry to the current-user and settings endpoints")
    void accessTokenGrantsAccess() throws Exception {
        registerTestUser();
        String accessToken = signInAndReadAccessToken();

        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL));

        mockMvc.perform(get("/api/v1/settings/account").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("the refresh cookie is exchanged for a new access token and rotated")
    void refreshRotatesTheSession() throws Exception {
        registerTestUser();
        MvcResult login = mockMvc.perform(loginRequest(EMAIL, PASSWORD, true)).andReturn();
        Cookie refreshCookie = login.getResponse().getCookie(REFRESH_COOKIE);
        assertThat(refreshCookie).isNotNull();

        MvcResult refreshed = mockMvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        Cookie rotated = refreshed.getResponse().getCookie(REFRESH_COOKIE);
        assertThat(rotated).isNotNull();
        assertThat(rotated.getValue()).isNotEqualTo(refreshCookie.getValue());

        // Replaying the old cookie is treated as token theft and refused.
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_TOKEN));
    }

    @Test
    @DisplayName("signing out invalidates the refresh cookie")
    void logoutEndsTheSession() throws Exception {
        registerTestUser();
        MvcResult login = mockMvc.perform(loginRequest(EMAIL, PASSWORD, false)).andReturn();
        Cookie refreshCookie = login.getResponse().getCookie(REFRESH_COOKIE);
        assertThat(refreshCookie).isNotNull();

        mockMvc.perform(post("/api/v1/auth/logout").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge(REFRESH_COOKIE, 0));

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("changing the password requires the current one and invalidates old tokens")
    void changePasswordInvalidatesExistingTokens() throws Exception {
        registerTestUser();
        String accessToken = signInAndReadAccessToken();

        String wrongCurrent = objectMapper.writeValueAsString(Map.of(
                "currentPassword", "NotMyPassw0rd",
                "password", "BrandNewPass1",
                "confirmPassword", "BrandNewPass1"));

        mockMvc.perform(put("/api/v1/settings/password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(wrongCurrent))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_CREDENTIALS));

        String correct = objectMapper.writeValueAsString(Map.of(
                "currentPassword", PASSWORD,
                "password", "BrandNewPass1",
                "confirmPassword", "BrandNewPass1"));

        mockMvc.perform(put("/api/v1/settings/password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(correct))
                .andExpect(status().isOk());

        // The token issued before the change no longer works.
        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(loginRequest(EMAIL, "BrandNewPass1", false)).andExpect(status().isOk());
    }

    // ---------------------------------------------------------------- helpers

    private void registerTestUser() throws Exception {
        mockMvc.perform(signupRequest("Jordan Blake", EMAIL, PASSWORD)).andExpect(status().isCreated());
    }

    private String signInAndReadAccessToken() throws Exception {
        String body = mockMvc.perform(loginRequest(EMAIL, PASSWORD, false))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        return json.get("accessToken").asText();
    }

    private String bearer(String accessToken) {
        return "Bearer " + accessToken;
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder signupRequest(
            String fullName, String email, String password) throws Exception {
        String payload = objectMapper.writeValueAsString(Map.of(
                "fullName", fullName,
                "email", email,
                "password", password,
                "confirmPassword", password));
        return post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(payload);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder loginRequest(
            String email, String password, boolean rememberMe) throws Exception {
        String payload = objectMapper.writeValueAsString(Map.of(
                "email", email,
                "password", password,
                "rememberMe", rememberMe));
        return post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(payload);
    }

}
