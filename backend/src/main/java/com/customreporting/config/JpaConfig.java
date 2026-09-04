package com.customreporting.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables automatic population of the created/updated timestamps declared on
 * {@link com.customreporting.common.AuditableEntity}.
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
