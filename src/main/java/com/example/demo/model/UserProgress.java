package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.HashSet;
import java.util.Set;

/**
 * Entity representing a user's learning progress.
 * Tracks completed lessons, study streak, and total study time.
 */
@Entity
@Table(name = "user_progress")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Total number of lessons completed.
     * This should always stay in sync with completedLessons.size().
     */
    @Builder.Default
    private int lessonsCompleted = 0;

    /**
     * Current study streak (consecutive days studied).
     */
    @Builder.Default
    private int studyStreak = 0;

    /**
     * Total study time in minutes.
     */
    @Builder.Default
    private int totalStudyTime = 0;

    /**
     * Stores IDs of completed lessons.
     * Ensures persistence across multiple logins/days.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "user_completed_lessons",
        joinColumns = @JoinColumn(name = "progress_id")
    )
    @Column(name = "lesson_id")
    @Builder.Default
    private Set<String> completedLessons = new HashSet<>();

    /**
     * Link back to the user.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    /**
     * Last date the user studied (used for streak calculation).
     */
    @Temporal(TemporalType.DATE)
    private Date lastStudiedDate;

    // --- Utility Methods ---

    /**
     * Marks a lesson as completed. Updates both completedLessons set and lessonsCompleted count.
     */
    public void completeLesson(String lessonId) {
        if (this.completedLessons.add(lessonId)) {
            this.lessonsCompleted = this.completedLessons.size();
        }
    }

    /**
     * Adds study time (in minutes).
     */
    public void addStudyTime(int minutes) {
        this.totalStudyTime += minutes;
    }

    /**
     * Resets streak back to zero (e.g., if a day was missed).
     */
    public void resetStreak() {
        this.studyStreak = 0;
    }

    /**
     * Increments streak count (used if studied consecutively).
     */
    public void incrementStreak() {
        this.studyStreak++;
    }
}
