package com.customreporting.exception;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends ApplicationException {

    public DuplicateResourceException(String code, String message) {
        super(HttpStatus.CONFLICT, code, message);
    }
}
