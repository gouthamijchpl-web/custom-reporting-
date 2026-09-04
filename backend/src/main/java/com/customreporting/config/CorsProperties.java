package com.customreporting.config;

import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * Origins allowed to call the API from a browser. Credentials are enabled, so wildcards
 * are deliberately not supported: every origin must be listed explicitly.
 *
 * @param allowedOrigins fully qualified origins, e.g. {@code https://reports.example.com}
 */
@Validated
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(@NotEmpty List<String> allowedOrigins) {
}
