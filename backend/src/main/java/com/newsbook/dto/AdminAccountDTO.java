package com.newsbook.dto;

import com.newsbook.entity.User;

public class AdminAccountDTO {
    private Long id;
    private String username;
    private String password;
    private Long tileId;
    private String state;
    private String district;

    public AdminAccountDTO() {}

    public AdminAccountDTO(Long id, String username, String password, Long tileId) {
        this(id, username, password, tileId, null, null);
    }

    public AdminAccountDTO(Long id, String username, String password, Long tileId, String state, String district) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.tileId = tileId;
        this.state = state;
        this.district = district;
    }

    public static AdminAccountDTO fromEntity(User user, String state, String district) {
        return new AdminAccountDTO(user.getId(), user.getUsername(), user.getPassword(), user.getTileId(), state, district);
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

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }
}
