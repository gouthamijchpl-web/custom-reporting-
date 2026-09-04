package com.customreporting.modules.report;

import com.customreporting.common.ModulePlaceholderResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reserved namespace for the Reports module.
 *
 * <p>Report creation, listing and export arrive in a later phase; the default report
 * preferences already stored per account are the settings this module will read.</p>
 */
@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Reports", description = "Placeholder for the future reporting module")
public class ReportController {

    @GetMapping
    @Operation(summary = "Report the implementation status of the reports module")
    public ResponseEntity<ModulePlaceholderResponse> status() {
        return ResponseEntity.ok(ModulePlaceholderResponse.notImplemented(
                "reports", "The reports module will be implemented in a later phase."));
    }
}
