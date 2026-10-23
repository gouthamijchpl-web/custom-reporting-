package com.customreporting.auth.service;

import com.customreporting.auth.dto.AuthenticationResponse;
import com.customreporting.auth.dto.ForgotPasswordRequest;
import com.customreporting.auth.dto.LoginRequest;
import com.customreporting.auth.dto.SignupRequest;
import com.customreporting.auth.dto.UserResponse;
import com.customreporting.auth.model.RefreshToken;
import com.customreporting.auth.repository.PasswordResetTokenRepository;
import com.customreporting.auth.repository.RefreshTokenRepository;
import com.customreporting.config.SecurityProperties;
import com.customreporting.exception.ApplicationException;
import com.customreporting.exception.BusinessRuleException;
import com.customreporting.exception.DuplicateResourceException;
import com.customreporting.exception.ErrorCode;
import com.customreporting.exception.InvalidCredentialsException;
import com.customreporting.exception.InvalidTokenException;
import com.customreporting.exception.ResourceNotFoundException;
import com.customreporting.security.JwtService;
import com.customreporting.security.SecureTokenGenerator;
import com.customreporting.user.AccessStatus;
import com.customreporting.user.Role;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * All authentication business logic: registration, sign-in, session rotation, sign-out and
 * password recovery. Controllers only translate between HTTP and these operations.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** Deliberately says nothing about which half of the credentials was wrong. */
    private static final String GENERIC_CREDENTIALS_MESSAGE = "Incorrect email address or password.";
    private static final String GENERIC_PASSWORD_CREATION_MESSAGE =
            "Unable to create the password. Check the information and try again.";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecureTokenGenerator tokenGenerator;
    private final SecurityProperties securityProperties;
    private final AccountSecurityService accountSecurityService;
    private final PasswordResetRateLimiter passwordResetRateLimiter;
    private final boolean detailedErrors;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       SecureTokenGenerator tokenGenerator,
                       SecurityProperties securityProperties,
                       AccountSecurityService accountSecurityService,
                       PasswordResetRateLimiter passwordResetRateLimiter) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenGenerator = tokenGenerator;
        this.securityProperties = securityProperties;
        this.accountSecurityService = accountSecurityService;
        this.passwordResetRateLimiter = passwordResetRateLimiter;
        this.detailedErrors = securityProperties.detailedAuthenticationErrors();

        if (detailedErrors) {
            // Loud on purpose: this must never go unnoticed outside local development.
            log.warn("Detailed authentication errors are ENABLED. Sign-in responses reveal whether an "
                    + "email address is registered. This is for local development only.");
        }
    }

    /**
     * Creates an account, or completes one an administrator invited.
     *
     * <p>Registering is not the same as being allowed in. Three cases are handled:</p>
     * <ul>
     *   <li>The address was <strong>invited</strong> by an administrator — the invitation is
     *       claimed: the chosen password is attached, and the role the administrator
     *       assigned is kept. A pending invitation becomes active at this point, because
     *       the only thing it was waiting for was registration.</li>
     *   <li>Nobody has registered yet — this is the <strong>first account</strong>, so it
     *       becomes an active administrator. Otherwise there would be no one able to grant
     *       anybody else access.</li>
     *   <li>Anyone else self-registering is left <strong>pending</strong>. An account
     *       existing must not by itself confer access to the application.</li>
     * </ul>
     *
     * <p>Email uniqueness is checked case insensitively here and again by the unique
     * database index, so concurrent sign-ups cannot both succeed.</p>
     */
    @Transactional
    public UserResponse register(SignupRequest request) {
        String email = normaliseEmail(request.email());
        String fullName = request.fullName().trim();
        String encodedPassword = passwordEncoder.encode(request.password());

        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User invited = existing.get();

            // A registered account, or one whose access an administrator withdrew, is not
            // something sign-up may take over.
            if (invited.hasPassword() || invited.isDeleted()) {
                throw new DuplicateResourceException(ErrorCode.EMAIL_ALREADY_REGISTERED,
                        "An account with this email address already exists.");
            }

            invited.setFullName(fullName);
            invited.setPasswordHash(encodedPassword);
            invited.recordCredentialChange();
            if (invited.getAccessStatus() == AccessStatus.PENDING) {
                invited.setAccessStatus(AccessStatus.ACTIVE);
            }

            User claimed = userRepository.save(invited);
            log.info("Invitation claimed by account {}", claimed.getId());
            return UserResponse.from(claimed);
        }

        boolean isFirstAccount = userRepository.countByDeletedAtIsNull() == 0;

        User user = new User(fullName, email, encodedPassword);
        user.setRole(isFirstAccount ? Role.ADMIN : Role.USER);
        user.setAccessStatus(isFirstAccount ? AccessStatus.ACTIVE : AccessStatus.PENDING);

        User saved = userRepository.save(user);
        log.info("Registered new account {} as {} ({})", saved.getId(), saved.getRole(), saved.getAccessStatus());
        return UserResponse.from(saved);
    }

    /**
     * Verifies credentials and opens a session.
     *
     * <p>Failed attempts are counted and the account is temporarily locked once the
     * configured threshold is reached, which blunts online brute force attacks.</p>
     *
     * <p>By default the message is identical for an unknown address and a wrong password,
     * so the endpoint cannot be used to discover which addresses hold accounts. The dev
     * profile turns on {@code detailedAuthenticationErrors} to say which of the two it
     * was, because "invalid credentials" is close to useless when you are trying to work
     * out why your own sign-in is failing.</p>
     */
    @Transactional
    public AuthenticationResult login(LoginRequest request, String userAgent, String ipAddress) {
        String email = normaliseEmail(request.email());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.debug("Sign-in attempt for an address with no account: {}", email);
                    return new InvalidCredentialsException(detailedErrors
                            ? "No account exists for " + email + ". Check the address, or sign up first."
                            : GENERIC_CREDENTIALS_MESSAGE);
                });

        if (user.isCurrentlyLocked()) {
            throw new ApplicationException(HttpStatus.LOCKED, ErrorCode.ACCOUNT_LOCKED,
                    "Too many failed sign-in attempts. Please try again later.");
        }

        // An invited account has no password to compare against yet.
        if (!user.hasPassword()) {
            log.debug("Sign-in attempt for invited but unregistered account {}", user.getId());
            throw new InvalidCredentialsException(detailedErrors
                    ? "This address was invited but has not been registered yet. Use Sign Up to set a password."
                    : GENERIC_CREDENTIALS_MESSAGE);
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            // Recorded in its own transaction: the exception below rolls this one back.
            accountSecurityService.recordFailedLoginAttempt(user.getId());
            log.debug("Incorrect password supplied for account {}", user.getId());
            throw new InvalidCredentialsException(detailedErrors
                    ? "That account exists, but the password is incorrect."
                    : GENERIC_CREDENTIALS_MESSAGE);
        }

        // Access is checked only after the password is proven, so the state of an account
        // is never disclosed to someone who cannot already sign in to it.
        requireApplicationAccess(user);

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return issueSession(user, request.rememberMe(), userAgent, ipAddress);
    }

    /**
     * Exchanges a refresh token for a new access token, rotating the refresh token.
     *
     * <p>If a token that was already rotated away is presented, it is assumed to have been
     * stolen and every session of that account is revoked.</p>
     */
    @Transactional
    public AuthenticationResult refresh(String rawRefreshToken, String userAgent, String ipAddress) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new InvalidTokenException("No active session was found. Please sign in again.");
        }

        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenGenerator.hash(rawRefreshToken))
                .orElseThrow(() -> new InvalidTokenException("Your session is no longer valid. Please sign in again."));

        if (stored.isRevoked()) {
            log.warn("Reuse of a revoked refresh token detected for account {}; revoking all sessions",
                    stored.getUser().getId());
            // Same reasoning as a failed sign-in: this must survive the rollback below.
            accountSecurityService.revokeAllSessions(stored.getUser().getId());
            throw new InvalidTokenException("Your session is no longer valid. Please sign in again.");
        }
        if (stored.isExpired()) {
            throw new InvalidTokenException("Your session has expired. Please sign in again.");
        }

        User user = stored.getUser();
        // Access can be withdrawn mid-session, so it is re-checked on every renewal.
        if (!user.hasApplicationAccess() || user.isCurrentlyLocked()) {
            stored.revoke();
            throw new InvalidTokenException("Your session is no longer valid. Please sign in again.");
        }

        stored.revoke();
        return issueSession(user, stored.isRememberMe(), userAgent, ipAddress);
    }

    /**
     * Ends the session tied to the supplied refresh token. Always succeeds, so signing out
     * is never blocked by an already invalid token.
     */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(tokenGenerator.hash(rawRefreshToken))
                .ifPresent(RefreshToken::revoke);
    }

    /** Ends every session of an account, for example after a password change. */
    @Transactional
    public void revokeAllSessions(User user) {
        refreshTokenRepository.revokeAllForUser(user, Instant.now());
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
        return UserResponse.from(user);
    }

    /**
     * Prototype-only password recovery performed entirely inside the application. Anyone
     * who knows an active account's email can invoke this flow, so rate limiting and the
     * generic failure response are mandatory and production should add another factor.
     */
    @Transactional
    public void createPassword(ForgotPasswordRequest request) {
        String email = normaliseEmail(request.email());
        String recoveryKey = tokenGenerator.hash(email);

        if (!passwordResetRateLimiter.tryAcquire(recoveryKey)) {
            log.warn("Blocked repeated password creation attempts for recovery key {}",
                    recoveryKey.substring(0, 12));
            throw passwordCreationFailed();
        }

        Optional<User> found = userRepository.findByEmail(email);
        if (found.isEmpty() || !found.get().isEnabled()) {
            // Keep failure timing closer to the successful path without storing anything.
            passwordEncoder.encode(request.password());
            log.warn("Rejected password creation for an unknown or inactive recovery key {}",
                    recoveryKey.substring(0, 12));
            throw passwordCreationFailed();
        }

        User user = found.get();
        applyNewPassword(user, request.password());
        passwordResetTokenRepository.invalidateAllForUser(user, Instant.now());
        revokeAllSessions(user);
        log.info("In-application password creation completed for account {}", user.getId());
    }

    private BusinessRuleException passwordCreationFailed() {
        return new BusinessRuleException(GENERIC_PASSWORD_CREATION_MESSAGE);
    }

    /** Stores a new password hash and invalidates access tokens issued before the change. */
    @Transactional
    public void applyNewPassword(User user, String rawPassword) {
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.recordCredentialChange();
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }

    private AuthenticationResult issueSession(User user, boolean rememberMe, String userAgent, String ipAddress) {
        Duration refreshTtl = rememberMe
                ? securityProperties.refreshToken().rememberMeTtl()
                : securityProperties.refreshToken().ttl();

        String rawRefreshToken = tokenGenerator.generateToken();
        refreshTokenRepository.save(new RefreshToken(
                user,
                tokenGenerator.hash(rawRefreshToken),
                Instant.now().plus(refreshTtl),
                rememberMe,
                truncate(userAgent, 300),
                truncate(ipAddress, 45)
        ));

        AuthenticationResponse response = AuthenticationResponse.of(
                jwtService.generateAccessToken(user),
                jwtService.accessTokenTtl().toSeconds(),
                UserResponse.from(user)
        );
        return new AuthenticationResult(response, rawRefreshToken, refreshTtl);
    }

    /**
     * Confirms the account is allowed into the application, not merely able to authenticate.
     *
     * <p>Correct credentials are necessary but not sufficient: an administrator can withdraw
     * access, or not yet have granted it, and either way the person must be told which it
     * is rather than being shown a misleading "wrong password".</p>
     */
    private void requireApplicationAccess(User user) {
        if (user.isDeleted()) {
            throw new ApplicationException(HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_DISABLED,
                    "Your access to this application has been removed. Please contact the administrator.");
        }

        switch (user.getAccessStatus()) {
            case ACTIVE -> {
                // Allowed through.
            }
            case INACTIVE -> throw new ApplicationException(HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_DISABLED,
                    "Your access to this application is currently disabled. "
                            + "Please contact the administrator.");
            case PENDING -> throw new ApplicationException(HttpStatus.FORBIDDEN, ErrorCode.ACCESS_PENDING,
                    "Your account is waiting for administrator approval. "
                            + "You will be able to sign in once access has been granted.");
        }
    }

    private String normaliseEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
