package com.newsbook.repository;

import com.newsbook.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByTileIdOrderByCreatedAtDesc(String tileId);
    List<Post> findByAdminIdOrderByCreatedAtDesc(Long adminId);
    List<Post> findByTileIdAndArchivedFalseOrderByCreatedAtDesc(String tileId);
    List<Post> findByAdminIdAndArchivedFalseOrderByCreatedAtDesc(Long adminId);
    List<Post> findByTileIdAndArchivedTrueOrderByCreatedAtDesc(String tileId);
    List<Post> findByAdminIdAndArchivedTrueOrderByCreatedAtDesc(Long adminId);
    List<Post> findByArchivedFalse();
}
