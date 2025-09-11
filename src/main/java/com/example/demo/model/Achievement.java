package com.example.demo.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "achievements")
public class Achievement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // e.g., "First Lesson"
    private String description; // e.g., "Complete your first lesson"
    private String icon; // e.g., "fa-book-open"

    @ManyToMany(mappedBy = "unlockedAchievements")
    @JsonIgnore // Prevent infinite loops
    private Set<User> users;
}