package com.customreporting.exception;

import org.springframework.http.HttpStatus;

public class InvalidTokenException extends ApplicationException {

    public InvalidTokenException(String message) {
        super(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_TOKEN, message);
    }
}
