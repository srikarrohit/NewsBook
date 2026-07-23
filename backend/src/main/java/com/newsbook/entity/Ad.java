package com.newsbook.entity;

import javax.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ads")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ad {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tileId;

    @Column(nullable = false)
    private Long adminId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(columnDefinition = "TEXT")
    private String image;

    @Column(nullable = false)
    private String tag = "tag ad";

    @Column(nullable = false)
    private Integer views = 0;

    @Column(nullable = false)
    private Integer clicks = 0;

    @Column(nullable = false)
    private Integer dismissals = 0;

    @Column(nullable = false)
    private Integer charges = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean archived = false;
        // Explicit getters and setters for all fields
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
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
        public boolean isArchived() { return archived; }
        public void setArchived(boolean archived) { this.archived = archived; }
    }
