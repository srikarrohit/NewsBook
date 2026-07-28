package com.newsbook.controller;

import com.newsbook.dto.TileDTO;
import com.newsbook.service.TileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tiles")
@CrossOrigin(origins = "*")
public class TileController {
    @Autowired
    private TileService tileService;

    @GetMapping
    public ResponseEntity<List<TileDTO>> getAllTiles(
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "district", required = false) String district) {
        boolean hasState = state != null && !state.trim().isEmpty();
        boolean hasDistrict = district != null && !district.trim().isEmpty();
        if (hasState && hasDistrict) {
            return ResponseEntity.ok(tileService.getTilesByLocation(state.trim(), district.trim()));
        }
        if (hasDistrict) {
            return ResponseEntity.ok(tileService.getTilesByDistrict(district.trim()));
        }
        return ResponseEntity.ok(tileService.getAllTiles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TileDTO> getTileById(@PathVariable Long id) {
        TileDTO tile = tileService.getTileById(id);
        if (tile != null) {
            return ResponseEntity.ok(tile);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<TileDTO> createTile(@RequestBody TileDTO tileDTO) {
        TileDTO created = tileService.createTile(tileDTO);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TileDTO> updateTile(@PathVariable Long id, @RequestBody TileDTO tileDTO) {
        TileDTO updated = tileService.updateTile(id, tileDTO);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTile(@PathVariable Long id) {
        tileService.deleteTile(id);
        return ResponseEntity.ok("Tile deleted successfully");
    }
}
