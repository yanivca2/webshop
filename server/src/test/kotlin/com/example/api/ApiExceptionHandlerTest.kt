package com.example.api

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

/**
 * The backstop handler, exercised through a controller that exists only to
 * fail. Nothing in the real API throws an unhandled exception on purpose, so
 * there is no production endpoint to point this at.
 */
@WebMvcTest(controllers = [ApiExceptionHandlerTest.FailingController::class])
// Imported rather than scanned: this controller lives in the test sources,
// which @WebMvcTest does not component-scan.
@Import(ApiExceptionHandlerTest.FailingController::class, ApiExceptionHandler::class)
class ApiExceptionHandlerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @RestController
    class FailingController {
        @GetMapping("/api/failing")
        fun fail(): Nothing = throw IllegalStateException("connection pool exhausted at 0x7f")
    }

    @Test
    fun `answers an unexpected failure with the ApiError shape`() {
        mockMvc
            .get("/api/failing")
            .andExpect {
                status { isInternalServerError() }
                jsonPath("$.status") { value(500) }
                jsonPath("$.error") { value("Internal Server Error") }
            }
    }

    @Test
    fun `keeps the internal detail out of the response`() {
        mockMvc
            .get("/api/failing")
            .andExpect {
                jsonPath("$.message") { value("Something went wrong. Please try again.") }
            }
    }

    @Test
    fun `leaves Spring's own status alone for an unmapped url`() {
        // The catch-all covers Exception, which includes the framework's own
        // exceptions - so without re-throwing those, this would answer 500.
        mockMvc
            .get("/api/nothing-here")
            .andExpect { status { isNotFound() } }
    }
}
