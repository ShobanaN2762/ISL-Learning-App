package com.example.demo.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder.Default;
import jakarta.persistence.*;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;

import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name cannot be empty")
    private String name;

    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Please provide a valid email format")
    private String email;

    @NotBlank(message = "Password cannot be empty")
    private String password;

    @Column(columnDefinition = "TEXT") // Use TEXT for potentially long bio content
    private String bio;

    @CreationTimestamp // This annotation automatically sets the date on creation
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "join_date", updatable = false)
    private Date joinDate;

    @Temporal(TemporalType.TIMESTAMP)
    private Date passwordLastUpdated;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserProgress userProgress;

    @ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.PERSIST)
    @JoinTable(name = "user_achievements",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "achievement_id"))
    @Default
    private Set<Achievement> unlockedAchievements = new HashSet<>();

}
