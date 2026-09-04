package com.customreporting.config;

import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Guarantees the application always has someone able to manage it.
 *
 * <p>Team management is restricted to administrators, so an installation with no active
 * administrator can never grant anyone access again — including to itself. That can happen
 * to a database created before roles mattered, where every account is an ordinary user.</p>
 *
 * <p>When no active administrator exists, the earliest surviving account is promoted. It
 * does nothing at all once one is present, so it is safe on every start-up.</p>
 */
@Component
public class AdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;

    public AdminBootstrap(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void ensureAdministratorExists() {
        long activeAdmins = userRepository.countByRoleAndAccessStatusAndDeletedAtIsNull(
                Role.ADMIN, AccessStatus.ACTIVE)
                + userRepository.countByRoleAndAccessStatusAndDeletedAtIsNull(
                        Role.OWNER, AccessStatus.ACTIVE);
        if (activeAdmins > 0) {
            return;
        }

        userRepository.findFirstByDeletedAtIsNullOrderByCreatedAtAsc().ifPresentOrElse(
                this::promote,
                () -> log.info("No accounts exist yet. The first account to sign up becomes the administrator."));
    }

    private void promote(User user) {
        user.setRole(Role.ADMIN);
        user.setAccessStatus(AccessStatus.ACTIVE);
        userRepository.save(user);

        log.warn("No active administrator was found. Promoted the earliest account ({}) to Admin "
                + "so the team can be managed.", user.getEmail());
    }
}
