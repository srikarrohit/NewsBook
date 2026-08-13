package com.newsbook.repository;

import com.newsbook.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByTileIdOrderByCreatedAtDesc(String tileId);
    List<Post> findByAdminIdOrderByCreatedAtDesc(Long adminId);
    List<Post> findByTileIdAndArchivedFalseOrderByCreatedAtDesc(String tileId);
    List<Post> findByAdminIdAndArchivedFalseOrderByCreatedAtDesc(Long adminId);
    // Reader-facing feed: only posts that are live and whose scheduled publish date has arrived.
    List<Post> findByTileIdAndArchivedFalseAndPublishAtLessThanEqualOrderByCreatedAtDesc(String tileId, LocalDateTime now);
    // Nightly purge: posts already shown to readers. Future-scheduled posts are left alone.
    List<Post> findByPublishAtLessThanEqual(LocalDateTime now);
}
