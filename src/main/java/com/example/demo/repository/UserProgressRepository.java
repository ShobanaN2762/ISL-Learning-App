package com.example.demo.repository;

import com.example.demo.model.UserProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {
    Optional<UserProgress> findByUserId(Long userId);
}