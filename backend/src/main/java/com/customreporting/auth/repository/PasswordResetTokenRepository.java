package com.customreporting.auth.repository;

import com.customreporting.auth.model.PasswordResetToken;
import com.customreporting.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findTopByUserOrderByCreatedAtDesc(User user);

    @Modifying
    @Query("update PasswordResetToken token set token.usedAt = :now "
            + "where token.user = :user and token.usedAt is null")
    int invalidateAllForUser(@Param("user") User user, @Param("now") Instant now);

    @Modifying
    @Query("delete from PasswordResetToken token where token.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
