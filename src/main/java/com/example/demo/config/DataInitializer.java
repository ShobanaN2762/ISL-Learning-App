package com.example.demo.config;

import com.example.demo.model.Achievement;
import com.example.demo.repository.AchievementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private AchievementRepository achievementRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("Checking and initializing achievements...");

        // Use a helper method to avoid repetition
        createAchievementIfNotExists("First Steps", "Complete your first lesson.", "fa-shoe-prints");
        createAchievementIfNotExists("Quick Learner", "Complete 5 lessons.", "fa-graduation-cap");
        createAchievementIfNotExists("Consistent Coder", "Maintain a 3-day study streak.", "fa-calendar-check");

        System.out.println("Achievements initialized successfully.");
    }

    /**
     * Helper method to check if an achievement with a given name exists,
     * and create it if it doesn't. This lets the database handle the ID.
     */
    private void createAchievementIfNotExists(String name, String description, String icon) {
        // Find by name to prevent creating duplicates on every restart
        Optional<Achievement> existingAchievement = achievementRepository.findByName(name);
        if (existingAchievement.isEmpty()) {
            Achievement newAchievement = Achievement.builder()
                .name(name)
                .description(description)
                .icon(icon)
                .build();
            achievementRepository.save(newAchievement);
            System.out.println(" -> Created achievement: " + name);
        }
    }
}