package com.newsbook.dto;

import com.newsbook.entity.User;

public class AdminAccountDTO {
    private Long id;
    private String username;
    private String password;
    private Long tileId;

    public AdminAccountDTO() {}

    public AdminAccountDTO(Long id, String username, String password, Long tileId) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.tileId = tileId;
    }

    public static AdminAccountDTO fromEntity(User user) {
        return new AdminAccountDTO(user.getId(), user.getUsername(), user.getPassword(), user.getTileId());
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Long getTileId() {
        return tileId;
    }

    public void setTileId(Long tileId) {
        this.tileId = tileId;
    }
}
