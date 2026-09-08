package com.customreporting.settings.service;

import com.customreporting.exception.BusinessRuleException;
import com.customreporting.exception.ResourceNotFoundException;
import com.customreporting.settings.dto.UserPreferenceRequest;
import com.customreporting.settings.dto.UserPreferenceResponse;
import com.customreporting.settings.model.UserPreference;
import com.customreporting.settings.repository.UserPreferenceRepository;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class UserPreferenceService {
    private static final Pattern VALID_KEY = Pattern.compile("[a-z0-9][a-z0-9._-]{0,99}");
    private static final int MAX_VALUE_CHARACTERS = 100_000;

    private final UserPreferenceRepository repository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public UserPreferenceService(UserPreferenceRepository repository, UserRepository userRepository,
                                 ObjectMapper objectMapper) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public UserPreferenceResponse get(UUID userId, String key) {
        String normalizedKey = requireKey(key);
        User user = requireUser(userId);
        return repository.findByUserAndKey(user, normalizedKey)
                .map(this::response)
                .orElseGet(() -> new UserPreferenceResponse(normalizedKey, NullNode.instance, null));
    }

    @Transactional
    public UserPreferenceResponse put(UUID userId, String key, UserPreferenceRequest request) {
        String normalizedKey = requireKey(key);
        User user = requireUser(userId);
        String json = serialize(request.value());
        if (json.length() > MAX_VALUE_CHARACTERS) {
            throw new BusinessRuleException("Preference value is too large.");
        }
        UserPreference value = repository.findByUserAndKey(user, normalizedKey)
                .orElseGet(() -> new UserPreference(user, normalizedKey, json));
        value.setValueJson(json);
        return response(repository.save(value));
    }

    private String requireKey(String key) {
        String normalized = key == null ? "" : key.trim().toLowerCase();
        if (!VALID_KEY.matcher(normalized).matches()) {
            throw new BusinessRuleException("Preference key is invalid.");
        }
        return normalized;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
    }

    private String serialize(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessRuleException("Preference could not be serialized.");
        }
    }

    private UserPreferenceResponse response(UserPreference value) {
        try {
            return new UserPreferenceResponse(value.getKey(), objectMapper.readTree(value.getValueJson()), value.getUpdatedAt());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored preference is invalid JSON.", exception);
        }
    }
}
