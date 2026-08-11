package com.newsbook.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Config {

    @Value("${aws.s3.region}")
    private String region;

    @Bean
    public S3Client s3Client() {
        // Credentials resolve from the default provider chain (AWS_ACCESS_KEY_ID /
        // AWS_SECRET_ACCESS_KEY env vars, ~/.aws/credentials, or an instance role) -
        // never read from application properties, so secrets never enter the repo.
        return S3Client.builder()
                .region(Region.of(region))
                .build();
    }
}
