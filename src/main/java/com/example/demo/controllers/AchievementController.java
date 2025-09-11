package com.example.demo.controllers;

import com.example.demo.model.Achievement;
import com.example.demo.service.AchievementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/achievements")
@CrossOrigin(origins = "*")
public class AchievementController {

    @Autowired
    private AchievementService achievementService;

    // GET endpoint to fetch a user's unlocked achievements
    @GetMapping("/{userId}")
    public ResponseEntity<Set<Achievement>> getUserAchievements(@PathVariable Long userId) {
        return ResponseEntity.ok(achievementService.getAchievementsForUser(userId));
    }

    // POST endpoint to trigger an achievement check for a user
    @PostMapping("/check/{userId}")
    public ResponseEntity<Set<Achievement>> checkAchievements(@PathVariable Long userId) {
        return ResponseEntity.ok(achievementService.checkAndAwardAchievements(userId));
    }
}