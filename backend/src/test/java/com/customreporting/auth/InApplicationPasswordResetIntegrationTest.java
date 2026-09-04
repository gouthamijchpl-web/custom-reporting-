package com.customreporting.auth;

import com.customreporting.auth.model.PasswordResetToken;
import com.customreporting.auth.repository.PasswordResetTokenRepository;
import com.customreporting.auth.repository.RefreshTokenRepository;
import com.customreporting.auth.service.PasswordResetRateLimiter;
import com.customreporting.exception.ErrorCode;
import com.customreporting.security.SecureTokenGenerator;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
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

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InApplicationPasswordResetIntegrationTest {

    private static final String EMAIL = "recovery.user@example.com";
    private static final String OLD_PASSWORD = "Or1ginalPass";
    private static final String NEW_PASSWORD = "N3wPassword123";
    private static final String GENERIC_FAILURE =
            "Unable to create the password. Check the information and try again.";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private SecureTokenGenerator tokenGenerator;
    @Autowired private PasswordResetRateLimiter rateLimiter;

    @BeforeEach
    void resetState() throws Exception {
        refreshTokenRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        userRepository.deleteAll();
        rateLimiter.clear();
        register(EMAIL, "Recovery User");
    }

    @Test
    @DisplayName("forgot password directly changes the application password and revokes sessions")
    void createsPasswordInsideTheApplication() throws Exception {
        MvcResult login = mockMvc.perform(login(EMAIL, OLD_PASSWORD))
                .andExpect(status().isOk())
                .andReturn();
        String accessToken = objectMapper.readTree(login.getResponse().getContentAsString())
                .get("accessToken").asText();
        Cookie refreshCookie = login.getResponse().getCookie("cr_refresh_token");
        assertThat(refreshCookie).isNotNull();

        User user = userRepository.findByEmail(EMAIL).orElseThrow();
        PasswordResetToken legacyToken = passwordResetTokenRepository.saveAndFlush(
                new PasswordResetToken(user, tokenGenerator.hash("legacy-reset-token"), Instant.now().plusSeconds(600)));

        mockMvc.perform(createPassword(EMAIL, NEW_PASSWORD, NEW_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("cr_refresh_token", 0))
                .andExpect(jsonPath("$.message").value("Your password has been changed successfully."));

        mockMvc.perform(login(EMAIL, OLD_PASSWORD)).andExpect(status().isUnauthorized());
        mockMvc.perform(login(EMAIL, NEW_PASSWORD)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
        assertThat(passwordResetTokenRepository.findById(legacyToken.getId()).orElseThrow().getUsedAt())
                .isNotNull();
    }

    @Test
    @DisplayName("unknown and inactive accounts receive the same generic failure")
    void hidesAccountDetailsOnFailure() throws Exception {
        String unknownBody = mockMvc.perform(createPassword(
                        "unknown@example.com", NEW_PASSWORD, NEW_PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.BUSINESS_RULE_VIOLATION))
                .andExpect(jsonPath("$.message").value(GENERIC_FAILURE))
                .andReturn().getResponse().getContentAsString();

        register("pending@example.com", "Pending User");
        String pendingBody = mockMvc.perform(createPassword(
                        "pending@example.com", NEW_PASSWORD, NEW_PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.BUSINESS_RULE_VIOLATION))
                .andExpect(jsonPath("$.message").value(GENERIC_FAILURE))
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(unknownBody).get("message"))
                .isEqualTo(objectMapper.readTree(pendingBody).get("message"));
    }

    @Test
    @DisplayName("repeated password creation is blocked by the cooldown")
    void throttlesRepeatedRequests() throws Exception {
        mockMvc.perform(createPassword(EMAIL, NEW_PASSWORD, NEW_PASSWORD))
                .andExpect(status().isOk());

        mockMvc.perform(createPassword(EMAIL, "An0therPass123", "An0therPass123"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(GENERIC_FAILURE));

        mockMvc.perform(login(EMAIL, NEW_PASSWORD)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("email, password policy and confirmation are validated before processing")
    void validatesTheRequest() throws Exception {
        mockMvc.perform(createPassword("not-an-email", "weak", "different"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_FAILED))
                .andExpect(jsonPath("$.fieldErrors.email").isArray())
                .andExpect(jsonPath("$.fieldErrors.password").isArray())
                .andExpect(jsonPath("$.fieldErrors.confirmPassword").isArray());
    }

    private void register(String email, String fullName) throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fullName", fullName,
                                "email", email,
                                "password", OLD_PASSWORD,
                                "confirmPassword", OLD_PASSWORD))))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder createPassword(
            String email, String password, String confirmation) throws Exception {
        return post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "email", email,
                        "password", password,
                        "confirmPassword", confirmation)));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder login(
            String email, String password) throws Exception {
        return post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "email", email,
                        "password", password,
                        "rememberMe", false)));
    }
}
