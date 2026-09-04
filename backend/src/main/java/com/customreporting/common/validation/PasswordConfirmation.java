package com.customreporting.common.validation;

/**
 * Implemented by request payloads that ask the user to type a password twice.
 * Enables a single reusable cross-field validator.
 */
public interface PasswordConfirmation {

    String password();

    String confirmPassword();
}
