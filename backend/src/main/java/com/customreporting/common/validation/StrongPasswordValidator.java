package com.customreporting.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Password policy: length plus character variety. Kept in sync with the matching
 * client-side strength meter, which is a usability aid only. This check is authoritative.
 */
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    public static final int MINIMUM_LENGTH = 10;
    public static final int MAXIMUM_LENGTH = 15;

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }
        if (password.length() < MINIMUM_LENGTH || password.length() > MAXIMUM_LENGTH) {
            return false;
        }

        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        for (int index = 0; index < password.length(); index++) {
            char character = password.charAt(index);
            if (Character.isUpperCase(character)) {
                hasUpper = true;
            } else if (Character.isLowerCase(character)) {
                hasLower = true;
            } else if (Character.isDigit(character)) {
                hasDigit = true;
            }
        }
        return hasUpper && hasLower && hasDigit;
    }
}
