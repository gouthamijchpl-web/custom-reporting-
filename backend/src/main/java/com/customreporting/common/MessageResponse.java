package com.customreporting.common;

/**
 * Generic acknowledgement payload for endpoints that have nothing else to return.
 *
 * @param message human readable outcome, safe to display in the UI
 */
public record MessageResponse(String message) {

    public static MessageResponse of(String message) {
        return new MessageResponse(message);
    }
}
