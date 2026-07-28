package com.newsbook.service;

import com.newsbook.dto.AdDTO;
import com.newsbook.entity.Ad;
import com.newsbook.entity.AdView;
import com.newsbook.repository.AdRepository;
import com.newsbook.repository.AdViewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AdService {
    @Autowired
    private AdRepository adRepository;

    @Autowired
    private AdViewRepository adViewRepository;

    public AdDTO createAd(Long tileId, Long adminId, String content, String image) {
        Ad ad = new Ad();
        ad.setTileId(tileId);
        ad.setAdminId(adminId);
        ad.setContent(content);
        ad.setImage(image);
        ad.setViews(0);
        ad.setClicks(0);
        ad.setDismissals(0);
        ad.setCharges(0);
        Ad savedAd = adRepository.save(ad);
        return toDTO(savedAd);
    }

    public List<AdDTO> getAdsByTile(Long tileId) {
        return adRepository.findByTileIdAndArchivedFalseOrderByCreatedAtDesc(tileId)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    public List<AdDTO> getAdsByAdmin(Long adminId) {
        return adRepository.findByAdminIdAndArchivedFalseOrderByCreatedAtDesc(adminId)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    public List<AdDTO> getArchivedAdsByTile(Long tileId) {
        return adRepository.findByTileIdAndArchivedTrueOrderByCreatedAtDesc(tileId)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    public void archiveAllActiveAds() {
        List<Ad> active = adRepository.findByArchivedFalse();
        active.forEach(ad -> ad.setArchived(true));
        adRepository.saveAll(active);
    }

    public AdDTO getAdById(Long id) {
        Optional<Ad> ad = adRepository.findById(id);
        return ad.map(this::convertToDTO).orElse(null);
    }

    public AdDTO updateAd(Long id, String content, String image) {
        Optional<Ad> optionalAd = adRepository.findById(id);
        if (!optionalAd.isPresent()) {
            return null;
        }
        Ad ad = optionalAd.get();
        if (content != null && !content.trim().isEmpty()) {
            ad.setContent(content);
        }
        if (image != null && !image.trim().isEmpty()) {
            ad.setImage(image);
        }
        Ad updated = adRepository.save(ad);
        return convertToDTO(updated);
    }

    public void trackAdView(Long adId, String ipAddress) {
        if (ipAddress == null || ipAddress.isEmpty()) {
            return;
        }
        // One view per IP address per ad — repeat visits from the same address
        // don't inflate the count.
        if (adViewRepository.existsByAdIdAndIpAddress(adId, ipAddress)) {
            return;
        }
        adRepository.findById(adId).ifPresent(ad -> {
            adViewRepository.save(new AdView(adId, ipAddress));
            ad.setViews(ad.getViews() + 1);
            adRepository.save(ad);
        });
    }

    public void trackAdClick(Long adId) {
        adRepository.findById(adId).ifPresent(ad -> {
            ad.setClicks(ad.getClicks() + 1);
            adRepository.save(ad);
        });
    }

    public void trackAdDismissal(Long adId) {
        adRepository.findById(adId).ifPresent(ad -> {
            ad.setDismissals(ad.getDismissals() + 1);
            adRepository.save(ad);
        });
    }

    public void trackAdCharge(Long adId) {
        adRepository.findById(adId).ifPresent(ad -> {
            ad.setCharges(ad.getCharges() + 1);
            adRepository.save(ad);
        });
    }

    public void deleteAd(Long id) {
        adRepository.deleteById(id);
    }
        // ...existing code...

        private AdDTO toDTO(Ad ad) {
            return new AdDTO(
                ad.getId(),
                ad.getTileId(),
                ad.getAdminId(),
                ad.getContent(),
                ad.getImage(),
                ad.getTag(),
                ad.getViews(),
                ad.getClicks(),
                ad.getDismissals(),
                ad.getCharges(),
                ad.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                ad.isArchived()
            );
        }

    private AdDTO convertToDTO(Ad ad) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return new AdDTO(
            ad.getId(),
            ad.getTileId(),
            ad.getAdminId(),
            ad.getContent(),
            ad.getImage(),
            ad.getTag(),
            ad.getViews(),
            ad.getClicks(),
            ad.getDismissals(),
            ad.getCharges(),
            ad.getCreatedAt().format(formatter),
            ad.isArchived()
        );
    }
}
