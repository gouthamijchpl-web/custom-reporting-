package com.customreporting.team.service;

import com.customreporting.auth.service.AccountSecurityService;
import com.customreporting.exception.BusinessRuleException;
import com.customreporting.exception.DuplicateResourceException;
import com.customreporting.exception.ErrorCode;
import com.customreporting.exception.ResourceNotFoundException;
import com.customreporting.team.dto.CreateTeamMemberRequest;
import com.customreporting.team.dto.TeamMemberResponse;
import com.customreporting.team.dto.UpdateTeamMemberRequest;
import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Team membership and application access.
 *
 * <p>Every operation here is reachable only by an administrator — the controller enforces
 * that — but the rules that stop an administrator locking everybody out live in this
 * layer, because they are business rules rather than access control:</p>
 * <ul>
 *   <li>Nobody may remove or deactivate their own account, which is the easiest way to
 *       lose the ability to fix a mistake.</li>
 *   <li>The last active administrator cannot be removed, deactivated or demoted, which
 *       would leave the application with no one able to manage it.</li>
 * </ul>
 *
 * <p>Removal is a soft delete. Work attributed to a member — uploads and reports, once
 * those modules exist — must remain attributable after their access ends.</p>
 */
@Service
public class TeamService {

    private static final Logger log = LoggerFactory.getLogger(TeamService.class);

    private final UserRepository userRepository;
    private final AccountSecurityService accountSecurityService;

    public TeamService(UserRepository userRepository, AccountSecurityService accountSecurityService) {
        this.userRepository = userRepository;
        this.accountSecurityService = accountSecurityService;
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> list(UUID currentUserId, String search, Role role, AccessStatus status) {
        String pattern = normaliseSearch(search);
        return userRepository.searchTeamMembers(pattern, role, status).stream()
                .map(member -> TeamMemberResponse.from(member, currentUserId))
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamMemberResponse get(UUID currentUserId, UUID memberId) {
        return TeamMemberResponse.from(requireMember(memberId), currentUserId);
    }

    /**
     * Adds a member. If the address belongs to someone previously removed, that record is
     * restored rather than duplicated, so their history stays attached to one account.
     */
    @Transactional
    public TeamMemberResponse add(UUID currentUserId, CreateTeamMemberRequest request) {
        String email = normaliseEmail(request.email());
        String fullName = request.fullName().trim();

        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User member = existing.get();
            if (!member.isDeleted()) {
                throw new DuplicateResourceException(ErrorCode.EMAIL_ALREADY_REGISTERED,
                        "Someone with this email address is already on the team.");
            }

            member.restore();
            member.setFullName(fullName);
            member.setRole(request.role());
            member.setAccessStatus(effectiveStatus(request.accessStatus(), member.hasPassword()));
            log.info("Administrator {} restored removed member {}", currentUserId, member.getId());
            return TeamMemberResponse.from(userRepository.save(member), currentUserId);
        }

        User member = User.invited(fullName, email, request.role(),
                // An invitation cannot be Active before there is a password to sign in with.
                effectiveStatus(request.accessStatus(), false));

        User saved = userRepository.save(member);
        log.info("Administrator {} added team member {}", currentUserId, saved.getId());
        return TeamMemberResponse.from(saved, currentUserId);
    }

    @Transactional
    public TeamMemberResponse update(UUID currentUserId, UUID memberId, UpdateTeamMemberRequest request) {
        User member = requireMember(memberId);

        boolean losesAdmin = member.getRole().isAdministrator() && !request.role().isAdministrator();
        boolean losesAccess = !request.accessStatus().grantsAccess();

        if (losesAccess) {
            requireNotSelf(currentUserId, member, "deactivate your own account");
        }
        if (losesAdmin || losesAccess) {
            requireAnotherAdminRemains(member, losesAdmin
                    ? "change the role of the only administrator"
                    : "deactivate the only administrator");
        }

        member.setFullName(request.fullName().trim());
        member.setRole(request.role());
        member.setAccessStatus(effectiveStatus(request.accessStatus(), member.hasPassword()));

        log.info("Administrator {} updated team member {}", currentUserId, memberId);
        return TeamMemberResponse.from(userRepository.save(member), currentUserId);
    }

    /**
     * Activates or deactivates a member. Deactivating also ends their live sessions, so the
     * change takes effect immediately rather than when their token happens to expire.
     */
    @Transactional
    public TeamMemberResponse changeAccessStatus(UUID currentUserId, UUID memberId, AccessStatus status) {
        User member = requireMember(memberId);

        if (!status.grantsAccess()) {
            requireNotSelf(currentUserId, member, "deactivate your own account");
            requireAnotherAdminRemains(member, "deactivate the only administrator");
        }
        if (status.grantsAccess() && !member.hasPassword()) {
            throw new BusinessRuleException(
                    "This person has not finished registering yet, so their access cannot be activated. "
                            + "They stay pending until they sign up with this email address.");
        }

        member.setAccessStatus(status);
        User saved = userRepository.save(member);

        if (!status.grantsAccess()) {
            accountSecurityService.revokeAllSessions(saved);
        }

        log.info("Administrator {} set member {} to {}", currentUserId, memberId, status);
        return TeamMemberResponse.from(saved, currentUserId);
    }

    /**
     * Removes a member's access while keeping the record. Their sessions end immediately.
     */
    @Transactional
    public void remove(UUID currentUserId, UUID memberId) {
        User member = requireMember(memberId);

        requireNotSelf(currentUserId, member, "remove your own account");
        requireAnotherAdminRemains(member, "remove the only administrator");

        member.markDeleted();
        userRepository.save(member);
        accountSecurityService.revokeAllSessions(member);

        log.info("Administrator {} removed team member {}", currentUserId, memberId);
    }

    // ---------------------------------------------------------------- rules

    /**
     * An invitation can only be marked Active once the person has a password, otherwise the
     * list would show access that does not yet work.
     */
    private AccessStatus effectiveStatus(AccessStatus requested, boolean registered) {
        if (requested.grantsAccess() && !registered) {
            return AccessStatus.PENDING;
        }
        return requested;
    }

    private void requireNotSelf(UUID currentUserId, User member, String action) {
        if (member.getId().equals(currentUserId)) {
            throw new BusinessRuleException("You cannot " + action
                    + ". Ask another administrator to do it for you.");
        }
    }

    /**
     * Blocks any change that would remove the last way in. Only applies when the member in
     * question is currently an active administrator.
     */
    private void requireAnotherAdminRemains(User member, String action) {
        boolean isActiveAdmin = member.getRole().isAdministrator() && member.getAccessStatus().grantsAccess();
        if (!isActiveAdmin) {
            return;
        }

        long activeAdmins = userRepository.countByRoleAndAccessStatusAndDeletedAtIsNull(
                Role.ADMIN, AccessStatus.ACTIVE)
                + userRepository.countByRoleAndAccessStatusAndDeletedAtIsNull(
                        Role.OWNER, AccessStatus.ACTIVE);
        if (activeAdmins <= 1) {
            throw new BusinessRuleException("You cannot " + action
                    + ", because the application would be left without one. "
                    + "Give someone else the Admin role first.");
        }
    }

    private User requireMember(UUID memberId) {
        return userRepository.findByIdAndDeletedAtIsNull(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("This team member was not found."));
    }

    private String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** @return a lower-cased {@code %term%} pattern, or null when nothing was searched for */
    private String normaliseSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        return "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
    }
}
