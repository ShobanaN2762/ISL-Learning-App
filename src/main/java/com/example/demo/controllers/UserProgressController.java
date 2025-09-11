package com.example.demo.controllers;

import com.example.demo.model.UserProgress;
import com.example.demo.service.UserProgressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/progress")
@CrossOrigin(origins = "*")
public class UserProgressController {

    @Autowired
    private UserProgressService userProgressService;

    // GET endpoint to fetch a user's progress
    @GetMapping("/{userId}")
    public ResponseEntity<UserProgress> getProgress(@PathVariable Long userId) {
    UserProgress progress = userProgressService.getProgressByUserId(userId);
    if (progress == null) {
        return ResponseEntity.notFound().build();
    }
        return ResponseEntity.ok(progress);
    }

    // POST endpoint to update a user's progress
    @PostMapping("/update/{userId}")
    public ResponseEntity<UserProgress> updateProgress(@PathVariable Long userId, @RequestBody UserProgress progressDetails) {
        UserProgress updatedProgress = userProgressService.updateProgress(userId, progressDetails);
        return ResponseEntity.ok(updatedProgress);
    }

    // This class would be a simple DTO with a lessonId field.
    public static class CompleteLessonRequest {
        public String lessonId;
    }

    @PostMapping("/complete-lesson/{userId}")
    public ResponseEntity<UserProgress> completeLesson(@PathVariable Long userId, @RequestBody CompleteLessonRequest request) {
        try {
            UserProgress updatedProgress = userProgressService.completeLesson(userId, request.lessonId);
            return ResponseEntity.ok(updatedProgress);
        } catch (IllegalStateException e) {
            return ResponseEntity.notFound().build();
        }
    }

     @PostMapping("/add-study-time/{userId}")
    public ResponseEntity<UserProgress> addStudyTime(@PathVariable Long userId, @RequestBody Integer minutes) {
        try {
            UserProgress updatedProgress = userProgressService.addStudyTime(userId, minutes);
            return ResponseEntity.ok(updatedProgress);
        } catch (IllegalStateException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/update-streak/{userId}")
    public ResponseEntity<UserProgress> updateStreak(@PathVariable Long userId) {
    try {
        // This line correctly passes the responsibility to the service
        UserProgress updatedProgress = userProgressService.updateStudyStreak(userId); 
        return ResponseEntity.ok(updatedProgress);
    } catch (IllegalStateException e) {
        return ResponseEntity.notFound().build();
    }
}
}