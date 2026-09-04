package com.customreporting.modules.workspace;

import com.customreporting.common.ModulePlaceholderResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reserved namespace for the Workspace module.
 *
 * <p>Intentionally free of business logic: the module is an empty placeholder in this
 * phase. The route exists so the URL space, security rules and client service layer are
 * settled before the feature work begins.</p>
 */
@RestController
@RequestMapping("/api/v1/workspace")
@Tag(name = "Workspace", description = "Placeholder for the future workspace module")
public class WorkspaceController {

    @GetMapping
    @Operation(summary = "Report the implementation status of the workspace module")
    public ResponseEntity<ModulePlaceholderResponse> status() {
        return ResponseEntity.ok(ModulePlaceholderResponse.notImplemented(
                "workspace", "The workspace module will be implemented in a later phase."));
    }
}
