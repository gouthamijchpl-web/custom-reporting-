package com.customreporting.auth.dto;

import com.customreporting.common.validation.PasswordConfirmation;
import com.customreporting.common.validation.PasswordsMatch;
import com.customreporting.common.validation.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@PasswordsMatch
public record ForgotPasswordRequest(

        @NotBlank(message = "Email address is required.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 254, message = "Email address is too long.")
        String email,

        @NotBlank(message = "New password is required.")
        @StrongPassword
        String password,

        @NotBlank(message = "Please confirm your new password.")
        String confirmPassword
) implements PasswordConfirmation {
}
