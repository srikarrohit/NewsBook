package com.newsbook.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/images")
@CrossOrigin(origins = "*")
public class ImageUploadController {
    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/images";

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file selected");
        }
        try {
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String ext = "";
            int i = originalFilename.lastIndexOf('.');
            if (i > 0) ext = originalFilename.substring(i);
            String newFilename = UUID.randomUUID() + ext;
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path filePath = uploadPath.resolve(newFilename);
            file.transferTo(filePath.toFile());
            String imageUrl = "/images/" + newFilename;
            java.util.Map<String, String> response = java.util.Collections.singletonMap("url", imageUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload image: " + e.getMessage());
        }
    }
}
