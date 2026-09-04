package com.customreporting.modules.upload;

import com.customreporting.common.ModulePlaceholderResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reserved namespace for the Data Upload module.
 *
 * <p>No upload handling exists yet. When it is added, the multipart limits already
 * declared in {@code application.yml} and the authenticated-by-default security rules
 * apply to it without further configuration.</p>
 */
@RestController
@RequestMapping("/api/v1/uploads")
@Tag(name = "Data Upload", description = "Placeholder for the future data upload module")
public class DataUploadController {

    @GetMapping
    @Operation(summary = "Report the implementation status of the data upload module")
    public ResponseEntity<ModulePlaceholderResponse> status() {
        return ResponseEntity.ok(ModulePlaceholderResponse.notImplemented(
                "data-upload", "The data upload module will be implemented in a later phase."));
    }
}
