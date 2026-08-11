package com.newsbook.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ArchiveScheduler {
    private static final Logger logger = LoggerFactory.getLogger(ArchiveScheduler.class);

    @Autowired
    private PostService postService;

    @Autowired
    private AdService adService;

    // Runs every day at midnight (server time): posts are permanently deleted (along with
    // their S3 image/text), while ads are only soft-archived so their performance stats
    // remain visible in the Archived Ads view.
    @Scheduled(cron = "0 0 0 * * *")
    public void archiveDailyContent() {
        logger.info("Midnight job: purging all posts and archiving all active ads");
        postService.purgeAllPosts();
        adService.archiveAllActiveAds();
    }
}
