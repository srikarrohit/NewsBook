package com.newsbook.dto;

public class TileDTO {
    private Long id;
    private String tileId;
    private String name;
    private String image;
    private Integer priority;
    private String state;
    private String district;

    public TileDTO() {}

    public TileDTO(Long id, String tileId, String name, String image) {
        this(id, tileId, name, image, 0);
    }

    public TileDTO(Long id, String tileId, String name, String image, Integer priority) {
        this(id, tileId, name, image, priority, null, null);
    }

    public TileDTO(Long id, String tileId, String name, String image, Integer priority, String state, String district) {
        this.id = id;
        this.tileId = tileId;
        this.name = name;
        this.image = image;
        this.priority = priority;
        this.state = state;
        this.district = district;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
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
