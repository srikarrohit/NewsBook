package com.newsbook.repository;

import com.newsbook.entity.AdView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdViewRepository extends JpaRepository<AdView, Long> {
    boolean existsByAdIdAndIpAddress(Long adId, String ipAddress);
}
