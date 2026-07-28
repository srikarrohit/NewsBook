package com.newsbook.controller;

import com.newsbook.dto.PostDTO;
import com.newsbook.dto.TileDTO;
import com.newsbook.dto.UserDTO;
import com.newsbook.service.PostService;
import com.newsbook.service.TileService;
import com.newsbook.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/posts")
@CrossOrigin(origins = "*")
public class PostController {
    @Autowired
    private PostService postService;

    @Autowired
    private UserService userService;

    @Autowired
    private TileService tileService;

    @PostMapping
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> request) {
        String tileId = request.get("tileId") instanceof String ? (String) request.get("tileId") : null;
        Object adminIdObj = request.get("adminId");
        String content = request.get("content") instanceof String ? (String) request.get("content") : null;
        String image = request.get("image") instanceof String ? (String) request.get("image") : null;
        String tag = request.get("tag") instanceof String ? (String) request.get("tag") : null;

        if (tileId == null || adminIdObj == null || content == null) {
            return ResponseEntity.badRequest().body("tileId, adminId and content are required");
        }

        Long adminId;
        try {
            adminId = ((Number) adminIdObj).longValue();
        } catch (ClassCastException ex) {
            return ResponseEntity.badRequest().body("adminId must be a number");
        }

        UserDTO adminUser = userService.getUserById(adminId);
        if (adminUser == null || !"ADMIN".equals(adminUser.getRole())) {
            return ResponseEntity.status(403).body("Only ADMIN users can create posts");
        }

        TileDTO adminTile = tileService.getTileByAdmin(adminId);
        if (adminTile == null) {
            return ResponseEntity.status(403).body("Admin is not assigned to any tile");
        }

        Long requestedTileId;
        try {
            requestedTileId = Long.parseLong(tileId);
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body("Invalid tileId format");
        }

        if (!requestedTileId.equals(adminTile.getId())) {
            return ResponseEntity.status(403).body("Admin cannot create posts for this tile");
        }

        PostDTO post = postService.createPost(tileId, adminId, content, image, tag);
        return ResponseEntity.ok(post);
    }

    @GetMapping("/tile/{tileId}")
    public ResponseEntity<?> getPostsByTile(@PathVariable String tileId) {
        List<PostDTO> posts = postService.getPostsByTile(tileId);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/tile/{tileId}/archived")
    public ResponseEntity<?> getArchivedPostsByTile(@PathVariable String tileId) {
        List<PostDTO> posts = postService.getArchivedPostsByTile(tileId);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/admin/{adminId}")
    public ResponseEntity<?> getPostsByAdmin(@PathVariable Long adminId) {
        List<PostDTO> posts = postService.getPostsByAdmin(adminId);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(@PathVariable Long id) {
        PostDTO post = postService.getPostById(id);
        if (post != null) {
            return ResponseEntity.ok(post);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePost(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        PostDTO existing = postService.getPostById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        Object adminIdObj = request.get("adminId");
        if (adminIdObj == null) {
            return ResponseEntity.badRequest().body("adminId is required");
        }
        Long adminId;
        try {
            adminId = ((Number) adminIdObj).longValue();
        } catch (ClassCastException ex) {
            return ResponseEntity.badRequest().body("adminId must be a number");
        }
        if (!adminId.equals(existing.getAdminId())) {
            return ResponseEntity.status(403).body("You can only edit your own posts");
        }

        String content = request.get("content") instanceof String ? (String) request.get("content") : null;
        String image = request.get("image") instanceof String ? (String) request.get("image") : null;
        String tag = request.get("tag") instanceof String ? (String) request.get("tag") : null;
        PostDTO updated = postService.updatePost(id, content, image, tag);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id) {
        postService.deletePost(id);
        return ResponseEntity.ok("Post deleted successfully");
    }
}
