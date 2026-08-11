package com.newsbook.service;

import com.newsbook.dto.PostDTO;
import com.newsbook.entity.Post;
import com.newsbook.repository.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PostService {
    private static final Logger logger = LoggerFactory.getLogger(PostService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private S3StorageService s3StorageService;

    public PostDTO createPost(String tileId, Long adminId, String content, String image, String tag, String publishAt) {
        Post post = new Post();
            post.setTileId(tileId.toString());
        post.setAdminId(adminId);
        post.setContent(content);
        post.setImage(image);
        post.setTag(tag != null && !tag.trim().isEmpty() ? tag : "General");
        if (publishAt != null && !publishAt.trim().isEmpty()) {
            post.setPublishAt(LocalDateTime.parse(publishAt));
        }
        Post savedPost = postRepository.save(post);
        backupContentToS3(savedPost);
        return convertToDTO(savedPost);
    }

    /** Reader-facing feed: excludes posts scheduled for a future publish date. */
    public List<PostDTO> getPublishedPostsByTile(String tileId) {
        return postRepository.findByTileIdAndArchivedFalseAndPublishAtLessThanEqualOrderByCreatedAtDesc(tileId.toString(), LocalDateTime.now())
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    /** Admin-facing feed: includes the admin's own scheduled (not-yet-published) posts so they can manage them. */
    public List<PostDTO> getPostsByTile(String tileId) {
        return postRepository.findByTileIdAndArchivedFalseOrderByCreatedAtDesc(tileId.toString())
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    public List<PostDTO> getPostsByAdmin(Long adminId) {
        return postRepository.findByAdminIdAndArchivedFalseOrderByCreatedAtDesc(adminId)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    public PostDTO getPostById(Long id) {
        Optional<Post> post = postRepository.findById(id);
        return post.map(this::convertToDTO).orElse(null);
    }

    public PostDTO updatePost(Long id, String content, String image, String tag, String publishAt) {
        Optional<Post> optionalPost = postRepository.findById(id);
        if (!optionalPost.isPresent()) {
            return null;
        }
        Post post = optionalPost.get();
        if (content != null && !content.trim().isEmpty()) {
            post.setContent(content);
        }
        if (image != null && !image.trim().isEmpty()) {
            post.setImage(image);
        }
        if (tag != null && !tag.trim().isEmpty()) {
            post.setTag(tag);
        }
        if (publishAt != null && !publishAt.trim().isEmpty()) {
            post.setPublishAt(LocalDateTime.parse(publishAt));
        }
        Post updated = postRepository.save(post);
        backupContentToS3(updated);
        return convertToDTO(updated);
    }

    public void deletePost(Long id) {
        postRepository.findById(id).ifPresent(this::deleteS3Assets);
        postRepository.deleteById(id);
    }

    /** Runs nightly: every post (and its S3 image/text) is permanently removed. */
    public void purgeAllPosts() {
        List<Post> all = postRepository.findAll();
        logger.info("Midnight purge job: permanently deleting {} post(s)", all.size());
        all.forEach(this::deleteS3Assets);
        postRepository.deleteAll(all);
    }

    private void backupContentToS3(Post post) {
        try {
            s3StorageService.uploadText("content/" + post.getId() + ".txt", post.getContent());
        } catch (Exception e) {
            logger.warn("Failed to back up post {} content to S3: {}", post.getId(), e.getMessage());
        }
    }

    private void deleteS3Assets(Post post) {
        String imageKey = s3StorageService.keyFromUrl(post.getImage());
        if (imageKey != null) {
            s3StorageService.deleteObject(imageKey);
        }
        s3StorageService.deleteObject("content/" + post.getId() + ".txt");
    }

    private PostDTO convertToDTO(Post post) {
        return new PostDTO(
            post.getId(),
            post.getTileId(),
            post.getAdminId(),
            post.getContent(),
            post.getImage(),
            post.getTag(),
            post.getCreatedAt().format(DATE_FORMATTER),
            post.isArchived(),
            post.getPublishAt() != null ? post.getPublishAt().format(DATE_FORMATTER) : null
        );
    }
}
