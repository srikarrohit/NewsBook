package com.newsbook.service;

import com.newsbook.dto.AdminAccountDTO;
import com.newsbook.dto.LoginRequest;
import com.newsbook.dto.UserDTO;
import com.newsbook.entity.Tile;
import com.newsbook.entity.User;
import com.newsbook.repository.TileRepository;
import com.newsbook.repository.UserRepository;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service

public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TileRepository tileRepository;

    public UserDTO login(LoginRequest loginRequest) {
        logger.info("Login attempt: username='{}', password='{}'", loginRequest.getUsername(), loginRequest.getPassword());
        Optional<User> user = userRepository.findByUsernameAndPassword(
            loginRequest.getUsername(),
            loginRequest.getPassword()
        );
        if (user.isPresent()) {
            logger.info("Login success for username='{}'", loginRequest.getUsername());
        } else {
            logger.warn("Login failed for username='{}'", loginRequest.getUsername());
        }
        return user.map(UserDTO::fromEntity).orElse(null);
    }

    public UserDTO getUserById(Long id) {
        Optional<User> user = userRepository.findById(id);
        return user.map(UserDTO::fromEntity).orElse(null);
    }

    public UserDTO getUserByUsername(String username) {
        Optional<User> user = userRepository.findByUsername(username);
        return user.map(UserDTO::fromEntity).orElse(null);
    }

    public List<AdminAccountDTO> getAllAdminAccounts() {
        return userRepository.findByRole(User.UserRole.ADMIN).stream()
            .map(user -> {
                Tile tile = resolveTile(user.getTileId());
                return AdminAccountDTO.fromEntity(user, tile != null ? tile.getState() : null, tile != null ? tile.getDistrict() : null);
            })
            .collect(Collectors.toList());
    }

    private Tile resolveTile(Long tileId) {
        if (tileId == null) {
            return null;
        }
        return tileRepository.findById(tileId).orElse(null);
    }

    public UserDTO createUser(String username, String password, User.UserRole role) {
        // If a user with the username already exists, reject duplicate creation
        Optional<User> existing = userRepository.findByUsername(username);
        if (existing.isPresent()) {
            logger.warn("Duplicate user creation prevented: username={}", username);
            throw new IllegalArgumentException("Username already exists: " + username);
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setRole(role);
        // Use saveAndFlush to ensure the generated ID is available immediately
        User savedUser = userRepository.saveAndFlush(user);
        logger.info("Created user id={} username={}", savedUser.getId(), savedUser.getUsername());
        return UserDTO.fromEntity(savedUser);
    }

    public UserDTO updateUserTile(Long userId, Long tileId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setTileId(tileId);
            User updatedUser = userRepository.save(user);
            return UserDTO.fromEntity(updatedUser);
        }
        return null;
    }
}
