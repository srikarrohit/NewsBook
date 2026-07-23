package com.newsbook.controller;

import com.newsbook.dto.AdminRegisterRequest;
import com.newsbook.dto.TileDTO;
import com.newsbook.dto.UserDTO;
import com.newsbook.entity.User;
import com.newsbook.service.TileService;
import com.newsbook.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    @Autowired
    private UserService userService;

    @Autowired
    private TileService tileService;

    /**
     * Register a new tile and create an admin user assigned to it.
     * Request body: { username, password, tileName, tileImage }
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerAdminAndTile(@RequestBody AdminRegisterRequest req) {
        if (req.getUsername() == null || req.getPassword() == null || req.getTileName() == null || req.getCreatedBy() == null) {
            return ResponseEntity.badRequest().body("username, password, tileName and createdBy are required");
        }

        // Verify creator is SUPER_ADMIN
        UserDTO creator = userService.getUserByUsername(req.getCreatedBy());
        if (creator == null || !"SUPER_ADMIN".equals(creator.getRole())) {
            return ResponseEntity.status(403).body("Only SUPER_ADMIN can register a new grid");
        }

        try {
            // Create admin user
            UserDTO createdUser = userService.createUser(req.getUsername(), req.getPassword(), User.UserRole.ADMIN);

            // Create tile and associate with admin
            TileDTO tileDTO = new TileDTO();
            tileDTO.setName(req.getTileName());
            tileDTO.setImage(req.getTileImage());
            tileDTO.setPriority(req.getPriority() != null ? req.getPriority() : 0);
            TileDTO createdTile = tileService.createTileForAdmin(createdUser.getId(), createdUser.getUsername(), tileDTO);

            // Associate user with tile
            userService.updateUserTile(createdUser.getId(), createdTile.getId());

            return ResponseEntity.ok().body(new Object[] { createdUser, createdTile });
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(409).body(ex.getMessage());
        }
    }

    /**
     * List all admin accounts with their credentials (super-admin action).
     * Query param: requestedBy=<super admin username>
     */
    @GetMapping("/list-admins")
    public ResponseEntity<?> listAdminAccounts(@RequestParam("requestedBy") String requestedBy) {
        UserDTO requester = userService.getUserByUsername(requestedBy);
        if (requester == null || !"SUPER_ADMIN".equals(requester.getRole())) {
            return ResponseEntity.status(403).body("Only SUPER_ADMIN can view admin accounts");
        }
        return ResponseEntity.ok(userService.getAllAdminAccounts());
    }

    /**
     * Create an admin user assigned to an existing tile (super-admin action)
     * Request body: { username, password, tileId }
     */
    @PostMapping("/create-admin")
    public ResponseEntity<?> createAdminForTile(@RequestBody com.newsbook.dto.CreateAdminForTileRequest req) {
        if (req.getUsername() == null || req.getPassword() == null || req.getTileId() == null || req.getCreatedBy() == null) {
            return ResponseEntity.badRequest().body("username, password, tileId and createdBy are required");
        }

        // Verify creator is SUPER_ADMIN
        UserDTO creator = userService.getUserByUsername(req.getCreatedBy());
        if (creator == null || !"SUPER_ADMIN".equals(creator.getRole())) {
            return ResponseEntity.status(403).body("Only SUPER_ADMIN can create admin users for a grid");
        }

        // Validate target tile
        TileDTO tile = tileService.getTileById(req.getTileId());
        if (tile == null) {
            return ResponseEntity.status(404).body("Tile not found for id: " + req.getTileId());
        }

        try {
            UserDTO created = userService.createUser(req.getUsername(), req.getPassword(), User.UserRole.ADMIN);
            userService.updateUserTile(created.getId(), req.getTileId());
            tileService.assignAdminToTile(req.getTileId(), created.getId(), created.getUsername());
            return ResponseEntity.ok().body(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(409).body(ex.getMessage());
        }
    }
}
