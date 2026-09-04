package com.customreporting.common.validation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class StrongPasswordValidatorTest {

    private final StrongPasswordValidator validator = new StrongPasswordValidator();

    @ParameterizedTest
    @ValueSource(strings = {"Str0ngPassw0rd", "An0therPassw0rd", "Xx1aaaaaaaaa"})
    @DisplayName("accepts passwords meeting length and character variety rules")
    void acceptsCompliantPasswords(String password) {
        assertThat(validator.isValid(password, null)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Short1A",              // below the minimum length
            "alllowercase123",      // no uppercase letter
            "ALLUPPERCASE123",      // no lowercase letter
            "NoDigitsInHerePlease"  // no digit
    })
    @DisplayName("rejects passwords that break any single rule")
    void rejectsNonCompliantPasswords(String password) {
        assertThat(validator.isValid(password, null)).isFalse();
    }

    @Test
    void rejectsNull() {
        assertThat(validator.isValid(null, null)).isFalse();
    }

    @Test
    void rejectsPasswordsBeyondTheMaximumLength() {
        String tooLong = "Aa1" + "x".repeat(StrongPasswordValidator.MAXIMUM_LENGTH);
        assertThat(validator.isValid(tooLong, null)).isFalse();
    }
}
