package com.customreporting.config;

import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * Origins allowed to call the API from a browser. Stable production origins are listed
 * explicitly. Narrow origin patterns may additionally be configured for deployment
 * previews whose generated hostname changes on every build.
 *
 * @param allowedOrigins fully qualified origins, e.g. {@code https://reports.example.com}
 * @param allowedOriginPatterns narrowly scoped preview-origin patterns
 */
@Validated
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(@NotEmpty List<String> allowedOrigins,
                             List<String> allowedOriginPatterns) {

    public CorsProperties {
        allowedOriginPatterns = allowedOriginPatterns == null ? List.of() : allowedOriginPatterns;
    }
}
