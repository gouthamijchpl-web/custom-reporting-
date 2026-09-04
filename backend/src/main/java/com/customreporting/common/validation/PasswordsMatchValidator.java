package com.customreporting.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Reports the mismatch against the confirmation field so the UI can highlight it directly.
 */
public class PasswordsMatchValidator implements ConstraintValidator<PasswordsMatch, PasswordConfirmation> {

    private String message;

    @Override
    public void initialize(PasswordsMatch constraintAnnotation) {
        this.message = constraintAnnotation.message();
    }

    @Override
    public boolean isValid(PasswordConfirmation payload, ConstraintValidatorContext context) {
        if (payload == null) {
            return true;
        }
        String password = payload.password();
        String confirmPassword = payload.confirmPassword();

        // Absence is reported by the @NotBlank constraints on the individual fields.
        if (password == null || confirmPassword == null) {
            return true;
        }
        if (password.equals(confirmPassword)) {
            return true;
        }

        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode("confirmPassword")
                .addConstraintViolation();
        return false;
    }
}
