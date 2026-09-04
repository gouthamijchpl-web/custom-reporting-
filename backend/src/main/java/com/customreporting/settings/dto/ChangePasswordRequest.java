package com.customreporting.settings.dto;

import com.customreporting.common.validation.PasswordConfirmation;
import com.customreporting.common.validation.PasswordsMatch;
import com.customreporting.common.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Password change from inside the application. The current password is required so that a
 * hijacked session cannot lock the real owner out.
 */
@PasswordsMatch
public record ChangePasswordRequest(

        @NotBlank(message = "Your current password is required.")
        @Size(max = 128, message = "Password is too long.")
        String currentPassword,

        @NotBlank(message = "A new password is required.")
        @StrongPassword
        String password,

        @NotBlank(message = "Please confirm your new password.")
        String confirmPassword

) implements PasswordConfirmation {
}
