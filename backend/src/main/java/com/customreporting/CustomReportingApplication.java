package com.customreporting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point of the Custom Reporting backend.
 *
 * <p>The application is organised into vertical slices ({@code auth}, {@code user},
 * {@code settings}, {@code modules}) that each follow the same layering:
 * controller &rarr; service &rarr; repository &rarr; entity, with DTOs on the boundary.</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class CustomReportingApplication {

    public static void main(String[] args) {
        SpringApplication.run(CustomReportingApplication.class, args);
    }
}
