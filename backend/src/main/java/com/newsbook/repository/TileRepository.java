package com.newsbook.repository;

import com.newsbook.entity.Tile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TileRepository extends JpaRepository<Tile, Long> {
    Optional<Tile> findByTileId(String tileId);
    Optional<Tile> findByAdminId(Long adminId);
}
