package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    public User registerUser(User user) {
    String email = user.getEmail();
    String password = user.getPassword();

    // --- Email validation ---
    if (email == null || !email.matches("^[\\w.-]+@[\\w.-]+\\.com$")) {
    throw new IllegalArgumentException("Email must be valid and end with .com");
    }

    // --- Password validation ---
    if (password == null || password.length() < 8 ||
        !password.matches(".*[A-Za-z].*") ||        // at least one letter
        !password.matches(".*\\d.*") ||             // at least one digit
        !password.matches(".*[!@#$%^&*()].*")) {     // at least one special char
    throw new IllegalArgumentException(
        "Password must be at least 8 characters long and include a letter, a number, and a special character."
        );
    }


    // Check if user already exists
    if (userRepository.findByEmail(email).isPresent()) {
         throw new IllegalStateException("User already exists with this email.");
    }

     return userRepository.save(user);

    }

    public User updateUser(Long id, User userDetails) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("User not found with id: " + id));

        user.setName(userDetails.getName());
        user.setBio(userDetails.getBio()); // Set the new bio

        // Only validate and set the password if a new one is provided
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            String password = userDetails.getPassword();
            // --- Re-apply the same validation rules from registration ---
            if (password.length() < 8 ||
                !password.matches(".*[A-Za-z].*") ||
                !password.matches(".*\\d.*") ||
                !password.matches(".*[!@#$%^&*()].*")) {
                throw new IllegalArgumentException(
                    "Password must be at least 8 characters long and include a letter, a number, and a special character."
                );
            }
            user.setPassword(password);
            user.setPasswordLastUpdated(new java.util.Date());
        }

        return userRepository.save(user);
    }
}