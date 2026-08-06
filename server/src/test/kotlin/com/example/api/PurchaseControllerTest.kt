package com.example.api

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

@WebMvcTest(PurchaseController::class)
@Import(PurchaseService::class, ProductRepository::class, PurchaseControllerTest.FixedClockConfig::class)
class PurchaseControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    // Needed for the tests to be deterministic. Can't call this just `clock`
    // since there's already a definition for one and Spring will reject another,
    // so it takes a different name and `@Primary` makes it the one injected.
    @TestConfiguration
    class FixedClockConfig {
        @Bean
        @Primary
        fun fixedClock(): Clock = Clock.fixed(Instant.parse("2026-08-07T10:15:30Z"), ZoneOffset.UTC)
    }

    private fun postPurchase(body: String) =
        mockMvc.post("/api/purchases") {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    @Test
    fun `creates an order and returns 201 with the priced lines`() {
        postPurchase("""{"items":[{"productId":"1","quantity":2}]}""")
            .andExpect {
                status { isCreated() }
                jsonPath("$.orderId") { exists() }
                jsonPath("$.itemCount") { value(2) }
                jsonPath("$.totalMinorUnits") { value(55998) }
                jsonPath("$.currency") { value("USD") }
                jsonPath("$.lines[0].name") { value("Sony WH-1000XM5 Wireless Headphones") }
            }
    }

    @Test
    fun `serialises placedAt as an ISO-8601 string rather than a timestamp`() {
        postPurchase("""{"items":[{"productId":"1","quantity":1}]}""")
            .andExpect {
                status { isCreated() }
                jsonPath("$.placedAt") { value("2026-08-07T10:15:30Z") }
            }
    }

    @Test
    fun `ignores a price supplied by the client`() {
        // The wire contract has no price field. Even if a tampered client sends
        // one, the charged total must come from the catalog.
        postPurchase("""{"items":[{"productId":"1","quantity":1,"priceMinorUnits":1,"name":"FREE"}]}""")
            .andExpect {
                status { isCreated() }
                jsonPath("$.totalMinorUnits") { value(27999) }
                jsonPath("$.lines[0].unitPriceMinorUnits") { value(27999) }
                jsonPath("$.lines[0].name") { value("Sony WH-1000XM5 Wireless Headphones") }
            }
    }

    @Test
    fun `rejects an empty basket`() {
        postPurchase("""{"items":[]}""")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
                jsonPath("$.message") { value("items must contain at least one item") }
            }
    }

    @Test
    fun `rejects a zero quantity`() {
        postPurchase("""{"items":[{"productId":"1","quantity":0}]}""")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.message") { value("items[0].quantity must be at least 1") }
            }
    }

    @Test
    fun `rejects a negative quantity`() {
        postPurchase("""{"items":[{"productId":"1","quantity":-3}]}""")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
            }
    }

    @Test
    fun `rejects a wrong-typed field with a 400 ApiError`() {
        postPurchase("""{"items":[{"productId":"1","quantity":"abc"}]}""")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
                jsonPath("$.error") { value("Bad Request") }
                jsonPath("$.message") { value("Malformed request body") }
            }
    }

    @Test
    fun `rejects a body missing a required field with a 400 ApiError`() {
        // productId has no default and isn't a primitive, so a missing value
        // fails at deserialization rather than reaching bean validation - unlike
        // a missing `quantity`, which Jackson would fill with the Int default of
        // 0 and let `@Min` reject instead.
        postPurchase("""{"items":[{"quantity":1}]}""")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.message") { value("Malformed request body") }
            }
    }

    @Test
    fun `rejects an unknown product with a 400 ApiError`() {
        postPurchase("""{"items":[{"productId":"9999","quantity":1}]}""")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.message") { value("No product with id 9999") }
            }
    }

    @Test
    fun `rejects a quantity beyond stock`() {
        postPurchase("""{"items":[{"productId":"1","quantity":15}]}""")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.message") { value("Only 14 of Sony WH-1000XM5 Wireless Headphones in stock, requested 15") }
            }
    }
}
