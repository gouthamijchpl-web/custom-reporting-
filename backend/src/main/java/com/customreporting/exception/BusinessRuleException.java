package com.customreporting.exception;

import org.springframework.http.HttpStatus;

/** Raised when a request is well formed but violates an application rule. */
public class BusinessRuleException extends ApplicationException {

    public BusinessRuleException(String message) {
        this(ErrorCode.BUSINESS_RULE_VIOLATION, message);
    }

    public BusinessRuleException(String code, String message) {
        super(HttpStatus.BAD_REQUEST, code, message);
    }
}
