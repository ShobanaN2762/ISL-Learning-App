package com.example.demo.service;

import com.example.demo.model.User;
import com.example.demo.model.UserProgress;
import com.example.demo.repository.UserProgressRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Calendar;
import java.util.Date;

@Service
public class UserProgressService {

    @Autowired
    private UserProgressRepository userProgressRepository;

    @Autowired
    private UserRepository userRepository;

    public UserProgress getProgressByUserId(Long userId) {
    return userProgressRepository.findByUserId(userId)
        .orElseGet(() -> {
            return userRepository.findById(userId)
                .map(user -> userProgressRepository.save(UserProgress.builder().user(user).build()))
                .orElse(null); // return null if user not found
        });
}

    public UserProgress createInitialProgress(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));
        UserProgress progress = UserProgress.builder().user(user).build();
        return userProgressRepository.save(progress);
    }

    public UserProgress updateProgress(Long userId, UserProgress progressDetails) {
        UserProgress progress = getProgressByUserId(userId);
        progress.setLessonsCompleted(progressDetails.getLessonsCompleted());
        progress.setStudyStreak(progressDetails.getStudyStreak());
        progress.setTotalStudyTime(progressDetails.getTotalStudyTime());
        return userProgressRepository.save(progress);
    }

    public UserProgress addStudyTime(Long userId, Integer minutes) {
        if (minutes == null || minutes <= 0) {
            // Do nothing if time is invalid
            return getProgressByUserId(userId);
        }
        UserProgress progress = getProgressByUserId(userId);
        progress.setTotalStudyTime(progress.getTotalStudyTime() + minutes);
        return userProgressRepository.save(progress);
    }

    public UserProgress updateStudyStreak(Long userId) {
        UserProgress progress = getProgressByUserId(userId);
        Date today = new Date();
        Date lastStudied = progress.getLastStudiedDate();

        // If user has never studied before, start the streak at 1
        if (lastStudied == null) {
            progress.setStudyStreak(1);
        } else {
            // Using Calendar to compare dates (ignoring time)
            Calendar calToday = Calendar.getInstance();
            calToday.setTime(today);

            Calendar calLastStudied = Calendar.getInstance();
            calLastStudied.setTime(lastStudied);

            // Check if the last session was on the same day
            boolean isSameDay = calToday.get(Calendar.YEAR) == calLastStudied.get(Calendar.YEAR) &&
                                calToday.get(Calendar.DAY_OF_YEAR) == calLastStudied.get(Calendar.DAY_OF_YEAR);

            if (!isSameDay) {
                // If it's a new day, check if it was yesterday
                calLastStudied.add(Calendar.DAY_OF_YEAR, 1);
                boolean isConsecutiveDay = calToday.get(Calendar.YEAR) == calLastStudied.get(Calendar.YEAR) &&
                                           calToday.get(Calendar.DAY_OF_YEAR) == calLastStudied.get(Calendar.DAY_OF_YEAR);
                
                if (isConsecutiveDay) {
                    // It was yesterday, so increment the streak
                    progress.setStudyStreak(progress.getStudyStreak() + 1);
                } else {
                    // It was more than a day ago, so reset the streak to 0
                    progress.setStudyStreak(0);
                }
            }
            // If it IS the same day, we do nothing to the streak count.
        }

        // Always update the last studied date to today
        progress.setLastStudiedDate(today);
        return userProgressRepository.save(progress);
    }

    public UserProgress completeLesson(Long userId, String lessonId) {
    UserProgress progress = userProgressRepository.findByUserId(userId)
        .orElseThrow(() -> new IllegalStateException("User progress not found"));

    // Only increment if lesson not already completed
    if (!progress.getCompletedLessons().contains(lessonId)) {
        progress.getCompletedLessons().add(lessonId);
        progress.setLessonsCompleted(progress.getLessonsCompleted() + 1);
    }
    this.updateStudyStreak(userId);
        progress.setLastStudiedDate(new Date());
        return userProgressRepository.save(progress);
    }


}