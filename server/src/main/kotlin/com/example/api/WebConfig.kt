package com.example.api

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

/**
 * CORS for local development.
 *
 * The Vite dev server proxies `/api` to :8080, so the browser normally sees
 * same-origin requests and never preflights. This exists so the client also
 * works when pointed straight at the backend (proxy disabled, a different dev
 * port, or a standalone build served elsewhere).
 *
 * Origins are listed explicitly rather than using a wildcard - a wildcard here
 * would be a habit worth not forming before this reaches an environment where
 * it matters.
 */
@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry
            .addMapping("/api/**")
            // TODO: these are dev-only origins. Replace with the real production
            // origin(s) before deployment, ideally sourced from configuration
            // rather than hardcoded here.
            .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .allowedMethods("GET", "POST")
            .allowedHeaders("Content-Type")
            .maxAge(MAX_AGE_SECONDS)
    }

    private companion object {
        const val MAX_AGE_SECONDS = 3600L
    }
}
