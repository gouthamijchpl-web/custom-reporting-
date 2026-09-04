package com.customreporting.team.controller;

import com.customreporting.common.MessageResponse;
import com.customreporting.security.AppUserPrincipal;
import com.customreporting.team.dto.CreateTeamMemberRequest;
import com.customreporting.team.dto.TeamMemberResponse;
import com.customreporting.team.dto.UpdateAccessStatusRequest;
import com.customreporting.team.dto.UpdateTeamMemberRequest;
import com.customreporting.team.service.TeamService;
import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Team membership and application access.
 *
 * <p>{@code @PreAuthorize} is declared on the class, so every endpoint here — present and
 * future — requires the Admin role. A signed-in ordinary user calling these directly gets
 * a 403 regardless of what the interface offers them, because the interface is only ever a
 * convenience and never the control.</p>
 */
@RestController
@RequestMapping("/api/v1/team/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Teams", description = "Manage who may use the application, and with what role")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping
    @Operation(summary = "List team members, optionally searched and filtered")
    public ResponseEntity<List<TeamMemberResponse>> list(
            @AuthenticationPrincipal AppUserPrincipal principal,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) AccessStatus status) {

        return ResponseEntity.ok(teamService.list(principal.getId(), search, role, status));
    }

    @GetMapping("/{memberId}")
    @Operation(summary = "Read a single team member")
    public ResponseEntity<TeamMemberResponse> get(@AuthenticationPrincipal AppUserPrincipal principal,
                                                  @PathVariable UUID memberId) {
        return ResponseEntity.ok(teamService.get(principal.getId(), memberId));
    }

    @PostMapping
    @Operation(summary = "Add someone to the team")
    public ResponseEntity<TeamMemberResponse> add(@AuthenticationPrincipal AppUserPrincipal principal,
                                                  @Valid @RequestBody CreateTeamMemberRequest request) {
        TeamMemberResponse created = teamService.add(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{memberId}")
    @Operation(summary = "Update a member's name, role and access")
    public ResponseEntity<TeamMemberResponse> update(@AuthenticationPrincipal AppUserPrincipal principal,
                                                     @PathVariable UUID memberId,
                                                     @Valid @RequestBody UpdateTeamMemberRequest request) {
        return ResponseEntity.ok(teamService.update(principal.getId(), memberId, request));
    }

    @PatchMapping("/{memberId}/status")
    @Operation(summary = "Activate or deactivate a member")
    public ResponseEntity<TeamMemberResponse> changeStatus(
            @AuthenticationPrincipal AppUserPrincipal principal,
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateAccessStatusRequest request) {

        return ResponseEntity.ok(
                teamService.changeAccessStatus(principal.getId(), memberId, request.accessStatus()));
    }

    @DeleteMapping("/{memberId}")
    @Operation(summary = "Remove a member's access, keeping their record for history")
    public ResponseEntity<MessageResponse> remove(@AuthenticationPrincipal AppUserPrincipal principal,
                                                  @PathVariable UUID memberId) {
        teamService.remove(principal.getId(), memberId);
        return ResponseEntity.ok(MessageResponse.of("User removed successfully."));
    }
}
