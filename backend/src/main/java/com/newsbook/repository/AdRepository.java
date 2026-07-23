package com.newsbook.repository;

import com.newsbook.entity.Ad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdRepository extends JpaRepository<Ad, Long> {
    List<Ad> findByTileIdOrderByCreatedAtDesc(Long tileId);
    List<Ad> findByAdminIdOrderByCreatedAtDesc(Long adminId);
    List<Ad> findByTileIdAndArchivedFalseOrderByCreatedAtDesc(Long tileId);
    List<Ad> findByAdminIdAndArchivedFalseOrderByCreatedAtDesc(Long adminId);
    List<Ad> findByTileIdAndArchivedTrueOrderByCreatedAtDesc(Long tileId);
    List<Ad> findByAdminIdAndArchivedTrueOrderByCreatedAtDesc(Long adminId);
    List<Ad> findByArchivedFalse();
}
