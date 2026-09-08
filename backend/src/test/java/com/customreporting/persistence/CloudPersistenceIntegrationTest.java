package com.customreporting.persistence;

import com.customreporting.entity.model.Branch;
import com.customreporting.entity.model.ReportingEntity;
import com.customreporting.entity.repository.BranchRepository;
import com.customreporting.entity.repository.ReportingEntityRepository;
import com.customreporting.modules.upload.dto.UploadStateRequest;
import com.customreporting.modules.upload.service.UploadStateService;
import com.customreporting.settings.dto.UserPreferenceRequest;
import com.customreporting.settings.service.UserPreferenceService;
import com.customreporting.user.User;
import com.customreporting.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CloudPersistenceIntegrationTest {

    @Autowired private UserRepository userRepository;
    @Autowired private ReportingEntityRepository entityRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private UploadStateService uploadStateService;
    @Autowired private UserPreferenceService preferenceService;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void storesUploadedTablesByEntityAndBranch() {
        User user = userRepository.save(new User("Cloud User", "cloud-persistence@example.com", "hash"));
        ReportingEntity entity = entityRepository.save(new ReportingEntity(user, "Cloud Entity", "CLOUD", null));
        Branch branch = branchRepository.save(new Branch(entity, "Main", "MAIN"));
        var uploads = objectMapper.createObjectNode();
        uploads.putArray("sales").addObject().put("fileName", "sales.xlsx");

        uploadStateService.put(user.getId(), new UploadStateRequest(entity.getId(), branch.getId(), uploads));

        var restored = uploadStateService.get(entity.getId(), branch.getId());
        assertThat(restored.uploadsByType().path("sales").get(0).path("fileName").asText())
                .isEqualTo("sales.xlsx");
    }

    @Test
    void storesUserInterfacePreferencesPerAccount() {
        User user = userRepository.save(new User("Preference User", "cloud-preference@example.com", "hash"));

        preferenceService.put(user.getId(), "reports.active-phase",
                new UserPreferenceRequest(objectMapper.getNodeFactory().textNode("phase-2")));

        assertThat(preferenceService.get(user.getId(), "reports.active-phase").value().asText())
                .isEqualTo("phase-2");
    }
}
