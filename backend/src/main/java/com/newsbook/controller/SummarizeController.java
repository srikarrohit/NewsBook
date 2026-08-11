package com.newsbook.controller;

import com.newsbook.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/summarize")
@CrossOrigin(origins = "*")
public class SummarizeController {

    private final GeminiService geminiService;

    public SummarizeController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping
    public ResponseEntity<?> summarize(@RequestBody Map<String, Object> request) {
        String text = request.get("text") instanceof String ? (String) request.get("text") : null;
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("text is required");
        }
        try {
            String summary = geminiService.summarize(text);
            return ResponseEntity.ok(Map.of("summary", summary));
        } catch (Exception e) {
            return ResponseEntity.status(502).body("Failed to summarize: " + e.getMessage());
        }
    }
}
