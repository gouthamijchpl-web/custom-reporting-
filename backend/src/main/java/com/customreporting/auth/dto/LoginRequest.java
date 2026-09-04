package com.customreporting.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sign-in payload.
 *
 * <p>The password is intentionally validated only for presence: applying the strength
 * rules here would leak the policy to anyone probing the endpoint and would reject
 * accounts created under an older policy.</p>
 *
 * @param email      login identifier
 * @param password   raw password, compared against the stored BCrypt hash
 * @param rememberMe extends the session lifetime when true
 */
public record LoginRequest(

        @NotBlank(message = "Email address is required.")
        @Size(max = 254, message = "Email address is too long.")
        String email,

        @NotBlank(message = "Password is required.")
        @Size(max = 128, message = "Password is too long.")
        String password,

        boolean rememberMe
) {
}
