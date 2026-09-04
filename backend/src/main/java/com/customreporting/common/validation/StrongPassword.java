package com.customreporting.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Enforces the application password policy on any string field. Applying the same
 * annotation to sign-up, password reset and password change keeps the rules in one place.
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

    String message() default "Password must be between 10 and 15 characters and include an uppercase letter, "
            + "a lowercase letter and a number.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
