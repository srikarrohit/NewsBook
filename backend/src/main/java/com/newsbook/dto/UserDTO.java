package com.newsbook.dto;

import com.newsbook.entity.User;

public class UserDTO {
    private Long id;
    private String username;
    private String role;
    private Long tileId;

    public UserDTO() {}

    public UserDTO(Long id, String username, String role, Long tileId) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.tileId = tileId;
    }

    public static UserDTO fromEntity(User user) {
        return new UserDTO(
            user.getId(),
            user.getUsername(),
            user.getRole().toString(),
            user.getTileId()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Long getTileId() {
        return tileId;
    }

    public void setTileId(Long tileId) {
        this.tileId = tileId;
    }
}
