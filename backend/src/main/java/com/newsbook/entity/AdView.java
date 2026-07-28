package com.newsbook.entity;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ad_views", uniqueConstraints = @UniqueConstraint(columnNames = {"ad_id", "ip_address"}))
public class AdView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ad_id", nullable = false)
    private Long adId;

    @Column(name = "ip_address", nullable = false)
    private String ipAddress;

    @Column(nullable = false, updatable = false)
    private LocalDateTime viewedAt = LocalDateTime.now();

    public AdView() {}

    public AdView(Long adId, String ipAddress) {
        this.adId = adId;
        this.ipAddress = ipAddress;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAdId() { return adId; }
    public void setAdId(Long adId) { this.adId = adId; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public LocalDateTime getViewedAt() { return viewedAt; }
    public void setViewedAt(LocalDateTime viewedAt) { this.viewedAt = viewedAt; }
}
