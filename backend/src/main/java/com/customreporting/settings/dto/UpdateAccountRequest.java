package com.customreporting.settings.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Profile fields a user may change themselves.
 *
 * @param fullName display name
 * @param email    login identifier; must stay unique across accounts
 */
public record UpdateAccountRequest(

        @NotBlank(message = "Full name is required.")
        @Size(min = 2, max = 120, message = "Full name must be between 2 and 120 characters.")
        String fullName,

        @NotBlank(message = "Email address is required.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 254, message = "Email address is too long.")
        String email
) {
}
