package com.example.api

import jakarta.validation.constraints.Size
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

/** Response contract mirrored by `client/src/types/api.ts`. */
data class GreetingResponse(
    val message: String,
    val generatedAt: Instant,
)

@RestController
@RequestMapping("/api")
@Validated
class GreetingController {
    @GetMapping("/greeting")
    fun greeting(
        @RequestParam(required = false, defaultValue = "")
        @Size(max = 50, message = "name must be 50 characters or fewer")
        name: String,
    ): GreetingResponse {
        val target = name.trim().ifEmpty { "world" }
        return GreetingResponse(
            message = "Hello, $target!",
            generatedAt = Instant.now(),
        )
    }
}
