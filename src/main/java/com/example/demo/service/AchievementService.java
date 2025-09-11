package com.example.demo.service;

import com.example.demo.model.Achievement;
import com.example.demo.model.User;
import com.example.demo.model.UserProgress;
import com.example.demo.repository.AchievementRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class AchievementService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AchievementRepository achievementRepository;

    @Autowired
    private UserProgressService userProgressService;

    private void checkAchievement(User user, Set<Achievement> existing, Long achievementId, boolean criteriaMet) {
        boolean hasAchievement = existing.stream().anyMatch(a -> a.getId().equals(achievementId));

        // If the user meets the criteria and doesn't already have the achievement
        if (criteriaMet && !hasAchievement) {
            // Find the achievement from the database (it was pre-loaded by DataInitializer)
            Achievement achievement = achievementRepository.findById(achievementId)
                    .orElseThrow(() -> new IllegalStateException("Achievement with ID " + achievementId + " not found in database!"));
            user.getUnlockedAchievements().add(achievement);
        }
    }

    // This method checks all achievements and awards new ones if criteria are met
    public Set<Achievement> checkAndAwardAchievements(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalStateException("User not found"));
        UserProgress progress = userProgressService.getProgressByUserId(userId);
        Set<Achievement> userAchievements = user.getUnlockedAchievements();

        // --- Achievement Logic ---

        // Achievement 1: First Lesson Complete
        checkAchievement(user, userAchievements, 1L, progress.getLessonsCompleted() >= 1);

        // Achievement 2: Five Lessons Complete
        checkAchievement(user, userAchievements, 2L, progress.getLessonsCompleted() >= 5);

        // Achievement 3: Study Streak of 3 days
        checkAchievement(user, userAchievements, 3L, progress.getStudyStreak() >= 3);
        
        userRepository.save(user);
        return user.getUnlockedAchievements();
    }

    public Set<Achievement> getAchievementsForUser(Long userId) {
        return userRepository.findById(userId).map(User::getUnlockedAchievements).orElse(Set.of());
    }
}