package com.customreporting.auth.dto;

import com.customreporting.common.validation.PasswordConfirmation;
import com.customreporting.common.validation.PasswordsMatch;
import com.customreporting.common.validation.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registration payload. Every rule enforced here is also enforced in the browser, but the
 * browser copy is a convenience only.
 */
@PasswordsMatch
public record SignupRequest(

        @NotBlank(message = "Full name is required.")
        @Size(min = 2, max = 120, message = "Full name must be between 2 and 120 characters.")
        String fullName,

        @NotBlank(message = "Email address is required.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 254, message = "Email address is too long.")
        String email,

        @NotBlank(message = "Password is required.")
        @StrongPassword
        String password,

        @NotBlank(message = "Please confirm your password.")
        String confirmPassword

) implements PasswordConfirmation {
}
