package com.newsbook.service;

import com.newsbook.dto.PostDTO;
import com.newsbook.entity.Post;
import com.newsbook.repository.PostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PostService {
    @Autowired
    private PostRepository postRepository;

    public PostDTO createPost(String tileId, Long adminId, String content, String image, String tag) {
        Post post = new Post();
            post.setTileId(tileId.toString());
        post.setAdminId(adminId);
        post.setContent(content);
        post.setImage(image);
        post.setTag(tag != null && !tag.trim().isEmpty() ? tag : "General");
        Post savedPost = postRepository.save(post);
        return convertToDTO(savedPost);
    }

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

    public List<PostDTO> getArchivedPostsByTile(String tileId) {
        return postRepository.findByTileIdAndArchivedTrueOrderByCreatedAtDesc(tileId.toString())
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    public PostDTO getPostById(Long id) {
        Optional<Post> post = postRepository.findById(id);
        return post.map(this::convertToDTO).orElse(null);
    }

    public void deletePost(Long id) {
        postRepository.deleteById(id);
    }

    public void archiveAllActivePosts() {
        List<Post> active = postRepository.findByArchivedFalse();
        active.forEach(post -> post.setArchived(true));
        postRepository.saveAll(active);
    }

    private PostDTO convertToDTO(Post post) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return new PostDTO(
            post.getId(),
            post.getTileId(),
            post.getAdminId(),
            post.getContent(),
            post.getImage(),
            post.getTag(),
            post.getCreatedAt().format(formatter),
            post.isArchived()
        );
    }
}
