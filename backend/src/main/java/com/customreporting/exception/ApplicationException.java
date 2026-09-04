package com.customreporting.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for all expected, business level failures. Carries the HTTP status and the
 * application error code so {@link GlobalExceptionHandler} can translate it directly.
 */
public class ApplicationException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApplicationException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
