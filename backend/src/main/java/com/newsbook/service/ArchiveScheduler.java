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

    // Runs every day at midnight (server time) and archives everything posted that day
    @Scheduled(cron = "0 0 0 * * *")
    public void archiveDailyContent() {
        logger.info("Midnight archive job: archiving all active posts and ads");
        postService.archiveAllActivePosts();
        adService.archiveAllActiveAds();
    }
}
