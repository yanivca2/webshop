package com.example.api

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@WebMvcTest(GreetingController::class)
class GreetingControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `greets the world by default`() {
        mockMvc.get("/api/greeting")
            .andExpect {
                status { isOk() }
                jsonPath("$.message") { value("Hello, world!") }
                jsonPath("$.generatedAt") { exists() }
            }
    }

    @Test
    fun `greets the provided name`() {
        mockMvc.get("/api/greeting") { param("name", "Ada") }
            .andExpect {
                status { isOk() }
                jsonPath("$.message") { value("Hello, Ada!") }
            }
    }

    @Test
    fun `rejects an over-long name`() {
        mockMvc.get("/api/greeting") { param("name", "a".repeat(51)) }
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
            }
    }
}
