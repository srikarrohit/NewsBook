package com.newsbook.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve static images from the resources folder and uploaded image directory
        Path uploadDir = Paths.get(System.getProperty("user.dir"), "images").toAbsolutePath();
        registry.addResourceHandler("/images/**")
                .addResourceLocations("classpath:/static/images/", "file:" + uploadDir.toString() + "/");
    }
}
