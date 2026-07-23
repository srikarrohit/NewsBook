package com.newsbook.dto;

public class CreateAdminForTileRequest {
    private String username;
    private String password;
    private Long tileId;
    private String createdBy;

    public CreateAdminForTileRequest() {}

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Long getTileId() { return tileId; }
    public void setTileId(Long tileId) { this.tileId = tileId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}
