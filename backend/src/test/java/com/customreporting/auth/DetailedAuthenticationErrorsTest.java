package com.customreporting.auth;

import com.customreporting.auth.repository.PasswordResetTokenRepository;
import com.customreporting.auth.repository.RefreshTokenRepository;
import com.customreporting.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pins down both halves of the {@code detailedAuthenticationErrors} switch.
 *
 * <p>The production behaviour is the one that matters for security, so it is asserted
 * explicitly rather than left to the default: an unknown address and a wrong password must
 * be indistinguishable, or the sign-in form becomes a way of discovering which addresses
 * hold accounts.</p>
 */
class DetailedAuthenticationErrorsTest {

    private static final String EMAIL = "workflow@example.com";
    private static final String PASSWORD = "Str0ngPassw0rd";
    private static final String GENERIC = "Incorrect email address or password.";

    /** Shared setup for both nested contexts. */
    abstract static class Base {

        @Autowired
        protected MockMvc mockMvc;

        @Autowired
        protected ObjectMapper objectMapper;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private RefreshTokenRepository refreshTokenRepository;

        @Autowired
        private PasswordResetTokenRepository passwordResetTokenRepository;

        @BeforeEach
        void registerAccount() throws Exception {
            refreshTokenRepository.deleteAll();
            passwordResetTokenRepository.deleteAll();
            userRepository.deleteAll();

            mockMvc.perform(post("/api/v1/auth/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "fullName", "Workflow Test",
                                    "email", EMAIL,
                                    "password", PASSWORD,
                                    "confirmPassword", PASSWORD))))
                    .andExpect(status().isCreated());
        }

        protected MockHttpServletRequestBuilder login(String email, String password) throws Exception {
            return post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(
                            Map.of("email", email, "password", password, "rememberMe", false)));
        }
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    @TestPropertySource(properties = "app.security.detailed-authentication-errors=false")
    @DisplayName("with detailed errors off (the production setting)")
    class ProductionBehaviour extends Base {

        @Test
        @DisplayName("an account created by sign-up can immediately sign in")
        void signupThenLoginSucceeds() throws Exception {
            mockMvc.perform(login(EMAIL, PASSWORD))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.user.email").value(EMAIL));
        }

        @Test
        @DisplayName("an unknown address and a wrong password are indistinguishable")
        void failuresAreIndistinguishable() throws Exception {
            mockMvc.perform(login("nobody@example.com", PASSWORD))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(GENERIC));

            mockMvc.perform(login(EMAIL, "Wr0ngPassword"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(GENERIC));
        }
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    @TestPropertySource(properties = "app.security.detailed-authentication-errors=true")
    @DisplayName("with detailed errors on (the dev profile setting)")
    class DevelopmentBehaviour extends Base {

        @Test
        @DisplayName("sign-in still succeeds with the right credentials")
        void signupThenLoginSucceeds() throws Exception {
            mockMvc.perform(login(EMAIL, PASSWORD)).andExpect(status().isOk());
        }

        @Test
        @DisplayName("an unknown address names the address that was not found")
        void unknownAddressIsNamed() throws Exception {
            mockMvc.perform(login("nobody@example.com", PASSWORD))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(
                            "No account exists for nobody@example.com. Check the address, or sign up first."));
        }

        @Test
        @DisplayName("a wrong password says the account exists")
        void wrongPasswordIsNamed() throws Exception {
            mockMvc.perform(login(EMAIL, "Wr0ngPassword"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("That account exists, but the password is incorrect."));
        }

        @Test
        @DisplayName("the address is matched regardless of casing or surrounding spaces")
        void emailMatchingIsForgiving() throws Exception {
            mockMvc.perform(login("  WorkFlow@Example.COM  ", PASSWORD)).andExpect(status().isOk());
        }
    }
}
