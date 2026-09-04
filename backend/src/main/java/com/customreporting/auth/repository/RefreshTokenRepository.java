package com.customreporting.auth.repository;

import com.customreporting.auth.model.RefreshToken;
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
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :now "
            + "where token.user = :user and token.revokedAt is null")
    int revokeAllForUser(@Param("user") User user, @Param("now") Instant now);

    @Modifying
    @Query("delete from RefreshToken token where token.expiresAt < :cutoff or token.revokedAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
