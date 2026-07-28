package com.newsbook.controller;

import com.newsbook.dto.AdDTO;
import com.newsbook.dto.TileDTO;
import com.newsbook.dto.UserDTO;
import com.newsbook.service.AdService;
import com.newsbook.service.TileService;
import com.newsbook.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ads")
@CrossOrigin(origins = "*")
public class AdController {
    @Autowired
    private AdService adService;

    @Autowired
    private UserService userService;

    @Autowired
    private TileService tileService;

    @PostMapping
    public ResponseEntity<?> createAd(@RequestBody Map<String, Object> request) {
        Object tileIdObj = request.get("tileId");
        Object adminIdObj = request.get("adminId");
        String content = request.get("content") instanceof String ? (String) request.get("content") : null;
        String image = request.get("image") instanceof String ? (String) request.get("image") : null;

        if (tileIdObj == null || adminIdObj == null || content == null) {
            return ResponseEntity.badRequest().body("tileId, adminId and content are required");
        }

        Long tileId = parseLongValue(tileIdObj);
        Long adminId = parseLongValue(adminIdObj);
        if (tileId == null || adminId == null) {
            return ResponseEntity.badRequest().body("tileId and adminId must be numeric or numeric strings");
        }

        UserDTO adminUser = userService.getUserById(adminId);
        if (adminUser == null || !"ADMIN".equals(adminUser.getRole())) {
            return ResponseEntity.status(403).body("Only ADMIN users can create ads");
        }

        TileDTO adminTile = tileService.getTileByAdmin(adminId);
        if (adminTile == null || !tileId.equals(adminTile.getId())) {
            return ResponseEntity.status(403).body("Admin cannot create ads for this tile");
        }

        AdDTO ad = adService.createAd(tileId, adminId, content, image);
        return ResponseEntity.ok(ad);
    }

    private Long parseLongValue(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        if (value instanceof String) {
            try {
                return Long.parseLong((String) value);
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    @GetMapping("/tile/{tileId}")
    public ResponseEntity<?> getAdsByTile(@PathVariable Long tileId) {
        List<AdDTO> ads = adService.getAdsByTile(tileId);
        return ResponseEntity.ok(ads);
    }

    @GetMapping("/tile/{tileId}/archived")
    public ResponseEntity<?> getArchivedAdsByTile(@PathVariable Long tileId) {
        List<AdDTO> ads = adService.getArchivedAdsByTile(tileId);
        return ResponseEntity.ok(ads);
    }

    @GetMapping("/admin/{adminId}")
    public ResponseEntity<?> getAdsByAdmin(@PathVariable Long adminId) {
        List<AdDTO> ads = adService.getAdsByAdmin(adminId);
        return ResponseEntity.ok(ads);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAdById(@PathVariable Long id) {
        AdDTO ad = adService.getAdById(id);
        if (ad != null) {
            return ResponseEntity.ok(ad);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAd(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        AdDTO existing = adService.getAdById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        Long adminId = parseLongValue(request.get("adminId"));
        if (adminId == null) {
            return ResponseEntity.badRequest().body("adminId is required and must be numeric");
        }
        if (!adminId.equals(existing.getAdminId())) {
            return ResponseEntity.status(403).body("You can only edit your own ads");
        }

        String content = request.get("content") instanceof String ? (String) request.get("content") : null;
        String image = request.get("image") instanceof String ? (String) request.get("image") : null;
        AdDTO updated = adService.updateAd(id, content, image);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<?> trackAdView(@PathVariable Long id, HttpServletRequest request) {
        adService.trackAdView(id, resolveClientIp(request));
        return ResponseEntity.ok("Ad view tracked");
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/{id}/click")
    public ResponseEntity<?> trackAdClick(@PathVariable Long id) {
        adService.trackAdClick(id);
        return ResponseEntity.ok("Ad click tracked");
    }

    @PostMapping("/{id}/dismissal")
    public ResponseEntity<?> trackAdDismissal(@PathVariable Long id) {
        adService.trackAdDismissal(id);
        return ResponseEntity.ok("Ad dismissal tracked");
    }

    @PostMapping("/{id}/charge")
    public ResponseEntity<?> trackAdCharge(@PathVariable Long id) {
        adService.trackAdCharge(id);
        return ResponseEntity.ok("Ad charge tracked");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAd(@PathVariable Long id) {
        adService.deleteAd(id);
        return ResponseEntity.ok("Ad deleted successfully");
    }
}
