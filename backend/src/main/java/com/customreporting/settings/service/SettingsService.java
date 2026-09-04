package com.customreporting.settings.service;

import com.customreporting.auth.dto.UserResponse;
import com.customreporting.auth.service.AuthService;
import com.customreporting.exception.BusinessRuleException;
import com.customreporting.exception.DuplicateResourceException;
import com.customreporting.exception.ErrorCode;
import com.customreporting.exception.ResourceNotFoundException;
import com.customreporting.settings.dto.ChangePasswordRequest;
import com.customreporting.settings.dto.UpdateAccountRequest;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

/**
 * Account management for the signed-in user: their own profile and their own password.
 *
 * <p>Anything concerning <em>other</em> people — roles, access, membership — belongs to
 * {@link com.customreporting.team.service.TeamService} and is restricted to
 * administrators.</p>
 */
@Service
public class SettingsService {

    private static final Logger log = LoggerFactory.getLogger(SettingsService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public SettingsService(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           AuthService authService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public UserResponse getAccount(UUID userId) {
        return UserResponse.from(requireUser(userId));
    }

    /**
     * Updates the profile. Changing the email address also changes the login identifier,
     * so uniqueness is re-checked.
     */
    @Transactional
    public UserResponse updateAccount(UUID userId, UpdateAccountRequest request) {
        User user = requireUser(userId);
        String email = normaliseEmail(request.email());

        if (!user.getEmail().equals(email) && userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException(ErrorCode.EMAIL_ALREADY_REGISTERED,
                    "Another account already uses this email address.");
        }

        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Changes the password after re-verifying the current one, then signs the account out
     * everywhere so that any other session created with the old password is dropped.
     */
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = requireUser(userId);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(ErrorCode.INVALID_CREDENTIALS,
                    "Your current password is incorrect.");
        }
        if (passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessRuleException("Your new password must be different from the current one.");
        }

        authService.applyNewPassword(user, request.password());
        authService.revokeAllSessions(user);
        log.info("Password changed for account {}", user.getId());
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
    }

    private String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
