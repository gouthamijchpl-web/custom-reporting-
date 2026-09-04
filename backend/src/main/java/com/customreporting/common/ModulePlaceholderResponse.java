package com.customreporting.common;

/**
 * Response returned by feature modules that are intentionally not implemented yet
 * (Workspace, Data Upload, Reports). It keeps the API surface discoverable while the
 * modules are still empty placeholders.
 *
 * @param module      machine readable module key
 * @param status      lifecycle status of the module, always {@code NOT_IMPLEMENTED} for now
 * @param description short explanation for API consumers
 */
public record ModulePlaceholderResponse(String module, String status, String description) {

    private static final String NOT_IMPLEMENTED = "NOT_IMPLEMENTED";

    public static ModulePlaceholderResponse notImplemented(String module, String description) {
        return new ModulePlaceholderResponse(module, NOT_IMPLEMENTED, description);
    }
}
