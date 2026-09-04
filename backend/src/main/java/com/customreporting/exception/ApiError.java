package com.customreporting.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Uniform error body returned by every failing endpoint.
 *
 * @param timestamp   when the failure happened
 * @param status      HTTP status code
 * @param error       HTTP status reason phrase
 * @param code        stable, machine readable application error code
 * @param message     human readable message, safe to show to the end user
 * @param path        request path that produced the error
 * @param fieldErrors per-field validation failures, only present for validation errors
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        Map<String, List<String>> fieldErrors
) {
}
