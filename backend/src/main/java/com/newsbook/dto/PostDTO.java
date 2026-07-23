package com.newsbook.dto;

public class PostDTO {
    private Long id;
    private String tileId;
    private Long adminId;
    private String content;
    private String image;
    private String tag;
    private String createdAt;
    private boolean archived;

    public PostDTO() {}

    public PostDTO(Long id, String tileId, Long adminId, String content, String image, String tag, String createdAt, boolean archived) {
        this.id = id;
        this.tileId = tileId;
        this.adminId = adminId;
        this.content = content;
        this.image = image;
        this.tag = tag;
        this.createdAt = createdAt;
        this.archived = archived;
    }

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public String getTileId() {
        return tileId;
    }
    public void setTileId(String tileId) {
        this.tileId = tileId;
    }
    public Long getAdminId() {
        return adminId;
    }
    public void setAdminId(Long adminId) {
        this.adminId = adminId;
    }
    public String getContent() {
        return content;
    }
    public void setContent(String content) {
        this.content = content;
    }
    public String getImage() {
        return image;
    }
    public void setImage(String image) {
        this.image = image;
    }
    public String getTag() {
        return tag;
    }
    public void setTag(String tag) {
        this.tag = tag;
    }
    public String getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
    public boolean isArchived() {
        return archived;
    }
    public void setArchived(boolean archived) {
        this.archived = archived;
    }
}
