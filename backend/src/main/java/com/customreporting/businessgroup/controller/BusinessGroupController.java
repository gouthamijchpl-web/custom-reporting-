package com.customreporting.businessgroup.controller;

import com.customreporting.businessgroup.dto.CreateGroupRequest;
import com.customreporting.businessgroup.dto.GroupResponse;
import com.customreporting.businessgroup.service.BusinessGroupService;
import com.customreporting.security.AppUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/groups")
public class BusinessGroupController {
    private final BusinessGroupService groupService;

    public BusinessGroupController(BusinessGroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    public List<GroupResponse> list() {
        return groupService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@AuthenticationPrincipal AppUserPrincipal principal,
                                @Valid @RequestBody CreateGroupRequest request) {
        return groupService.create(principal.getId(), request);
    }

    @PutMapping("/{groupId}")
    public GroupResponse update(@AuthenticationPrincipal AppUserPrincipal principal,
                                @PathVariable UUID groupId,
                                @Valid @RequestBody CreateGroupRequest request) {
        return groupService.update(principal.getId(), groupId, request);
    }

    @DeleteMapping("/{groupId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID groupId) {
        groupService.delete(groupId);
    }
}
