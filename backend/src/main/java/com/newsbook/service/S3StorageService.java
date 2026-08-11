package com.newsbook.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.charset.StandardCharsets;

/**
 * Bucket must grant public read via its bucket policy (not object ACLs -
 * new buckets default to ACLs disabled, so we don't set one on PutObject).
 */
@Service
public class S3StorageService {
    private static final Logger logger = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.region}")
    private String region;

    public S3StorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String uploadBytes(String key, byte[] data, String contentType) {
        s3Client.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(data));
        return publicUrl(key);
    }

    public String uploadText(String key, String text) {
        return uploadBytes(key, text.getBytes(StandardCharsets.UTF_8), "text/plain; charset=utf-8");
    }

    public void deleteObject(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (Exception e) {
            // Best-effort cleanup - a missing/already-deleted object shouldn't block the caller.
            logger.warn("Failed to delete S3 object {}: {}", key, e.getMessage());
        }
    }

    public String publicUrl(String key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }

    /** Extracts the object key back out of a URL produced by publicUrl(), or null if it isn't one of ours. */
    public String keyFromUrl(String url) {
        if (url == null) return null;
        String prefix = String.format("https://%s.s3.%s.amazonaws.com/", bucket, region);
        return url.startsWith(prefix) ? url.substring(prefix.length()) : null;
    }
}
