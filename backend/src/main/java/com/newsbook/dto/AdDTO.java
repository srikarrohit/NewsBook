package com.newsbook.dto;

public class AdDTO {
    private Long id;
    private Long tileId;
    private Long adminId;
    private String content;
    private String image;
    private String tag;
    private Integer views;
    private Integer clicks;
    private Integer dismissals;
    private Integer charges;
    private String createdAt;
    private boolean archived;

    public AdDTO() {}

    public AdDTO(Long id, Long tileId, Long adminId, String content, String image, String tag, Integer views, Integer clicks, Integer dismissals, Integer charges, String createdAt, boolean archived) {
        this.id = id;
        this.tileId = tileId;
        this.adminId = adminId;
        this.content = content;
        this.image = image;
        this.tag = tag;
        this.views = views;
        this.clicks = clicks;
        this.dismissals = dismissals;
        this.charges = charges;
        this.createdAt = createdAt;
        this.archived = archived;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTileId() { return tileId; }
    public void setTileId(Long tileId) { this.tileId = tileId; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public Integer getViews() { return views; }
    public void setViews(Integer views) { this.views = views; }
    public Integer getClicks() { return clicks; }
    public void setClicks(Integer clicks) { this.clicks = clicks; }
    public Integer getDismissals() { return dismissals; }
    public void setDismissals(Integer dismissals) { this.dismissals = dismissals; }
    public Integer getCharges() { return charges; }
    public void setCharges(Integer charges) { this.charges = charges; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
