package com.customreporting.settings.repository;

import com.customreporting.settings.model.UserPreference;
import com.customreporting.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, UUID> {
    Optional<UserPreference> findByUserAndKey(User user, String key);
}
