package com.newsbook.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
public class ArchiveScheduler {
    private static final Logger logger = LoggerFactory.getLogger(ArchiveScheduler.class);

    @Autowired
    private PostService postService;

    @Autowired
    private AdService adService;

    @Autowired
    private TileService tileService;

    @Autowired
    private S3StorageService s3StorageService;

    // Runs every day at IST midnight: already-published posts are permanently deleted (along
    // with their S3 image/text) - posts still scheduled for a future date are left alone.
    // Ads are only soft-archived so their performance stats remain visible in the Archived
    // Ads view. Finally, S3 is swept for uploads that never ended up attached to a saved
    // post/ad/tile, which the per-row deletes above can't otherwise find.
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void archiveDailyContent() {
        logger.info("Midnight job: purging published posts and archiving all active ads");
        postService.purgeAllPosts();
        adService.archiveAllActiveAds();

        Set<String> activeImageKeys = new HashSet<>();
        activeImageKeys.addAll(postService.getActiveS3Keys());
        activeImageKeys.addAll(adService.getActiveS3Keys());
        activeImageKeys.addAll(tileService.getActiveS3Keys());
        s3StorageService.sweepUnreferenced("images/", activeImageKeys);
        s3StorageService.sweepUnreferenced("content/", activeImageKeys);
    }
}
