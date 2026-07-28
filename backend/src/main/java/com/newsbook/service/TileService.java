package com.newsbook.service;

import com.newsbook.dto.TileDTO;
import com.newsbook.entity.Tile;
import com.newsbook.repository.TileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TileService {
    @Autowired
    private TileRepository tileRepository;

    public List<TileDTO> getAllTiles() {
        return tileRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<TileDTO> getTilesByDistrict(String district) {
        return tileRepository.findByDistrict(district).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<TileDTO> getTilesByLocation(String state, String district) {
        List<Tile> exactMatch = tileRepository.findByStateAndDistrict(state, district);
        // Fall back to a district-only match so grids whose state wasn't recorded
        // (e.g. registered before state tracking existed) still show up for readers
        // browsing by district, instead of silently disappearing.
        List<Tile> matches = exactMatch.isEmpty() ? tileRepository.findByDistrict(district) : exactMatch;
        return matches.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public TileDTO getTileById(Long id) {
        Optional<Tile> tile = tileRepository.findById(id);
        return tile.map(this::toDTO).orElse(null);
    }

    public TileDTO createTile(TileDTO tileDTO) {
        Tile tile = new Tile();
        tile.setName(tileDTO.getName());
        tile.setImage(tileDTO.getImage());
        tile.setTileId(tileDTO.getTileId() != null ? tileDTO.getTileId() : "tile_" + System.currentTimeMillis());
        Tile saved = tileRepository.save(tile);
        return toDTO(saved);
    }

    public TileDTO createTileForAdmin(Long adminId, String adminUsername, TileDTO tileDTO) {
        Tile tile = new Tile();
        tile.setTileId("tile_" + System.currentTimeMillis());
        tile.setAdminId(adminId != null ? adminId : 0L);
        tile.setAdminUsername(adminUsername != null ? adminUsername : "admin");
        tile.setName(tileDTO.getName());
        tile.setImage(tileDTO.getImage());
        tile.setPriority(tileDTO.getPriority() != null ? tileDTO.getPriority() : 0);
        tile.setState(tileDTO.getState());
        tile.setDistrict(tileDTO.getDistrict());
        Tile saved = tileRepository.save(tile);
        return toDTO(saved);
    }

    public TileDTO getTileByAdmin(Long adminId) {
        Optional<Tile> tile = tileRepository.findByAdminId(adminId);
        return tile.map(this::toDTO).orElse(null);
    }

    public TileDTO getTileByTileId(String tileId) {
        Optional<Tile> tile = tileRepository.findByTileId(tileId);
        return tile.map(this::toDTO).orElse(null);
    }

    public TileDTO assignAdminToTile(Long tileId, Long adminId, String adminUsername) {
        Optional<Tile> optionalTile = tileRepository.findById(tileId);
        if (!optionalTile.isPresent()) {
            return null;
        }
        Tile tile = optionalTile.get();
        tile.setAdminId(adminId);
        tile.setAdminUsername(adminUsername != null ? adminUsername : tile.getAdminUsername());
        Tile updated = tileRepository.save(tile);
        return toDTO(updated);
    }

    public TileDTO updateTile(Long id, TileDTO tileDTO) {
        Optional<Tile> optionalTile = tileRepository.findById(id);
        if (optionalTile.isPresent()) {
            Tile tile = optionalTile.get();
            if (tileDTO.getName() != null) {
                tile.setName(tileDTO.getName());
            }
            if (tileDTO.getImage() != null) {
                tile.setImage(tileDTO.getImage());
            }
            if (tileDTO.getTileId() != null && !tileDTO.getTileId().trim().isEmpty()) {
                tile.setTileId(tileDTO.getTileId().trim());
            }
            if (tileDTO.getPriority() != null) {
                tile.setPriority(tileDTO.getPriority());
            }
            if (tileDTO.getState() != null) {
                tile.setState(tileDTO.getState());
            }
            if (tileDTO.getDistrict() != null) {
                tile.setDistrict(tileDTO.getDistrict());
            }
            tile.setUpdatedAt(LocalDateTime.now());
            Tile updated = tileRepository.save(tile);
            return toDTO(updated);
        }
        return null;
    }

    public void deleteTile(Long id) {
        tileRepository.deleteById(id);
    }

    private TileDTO toDTO(Tile tile) {
        return new TileDTO(tile.getId(), tile.getTileId(), tile.getName(), tile.getImage(), tile.getPriority(), tile.getState(), tile.getDistrict());
    }
}
