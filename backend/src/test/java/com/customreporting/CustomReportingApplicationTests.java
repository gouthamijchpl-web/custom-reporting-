package com.customreporting;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** Verifies the whole application context, including security, wires up correctly. */
@SpringBootTest
@ActiveProfiles("test")
class CustomReportingApplicationTests {

    @Test
    void contextLoads() {
        // Fails if any bean, configuration property or security component is misconfigured.
    }
}
