package com.example.api

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

/**
 * Imports the real service and repository so these exercise the HTTP layer
 * against the actual catalog rather than a stub that could agree with a
 * broken implementation.
 */
@WebMvcTest(ProductController::class)
@Import(ProductService::class, ProductRepository::class)
class ProductControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `returns the whole catalog`() {
        mockMvc
            .get("/api/products")
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(32) }
                jsonPath("$[0].id") { value("1") }
                jsonPath("$[0].name") { value("Sony WH-1000XM5 Wireless Headphones") }
                jsonPath("$[0].brand") { value("Sony") }
                jsonPath("$[0].stock") { value(14) }
            }
    }

    @Test
    fun `serialises price as an integer count of minor units`() {
        mockMvc
            .get("/api/products/1")
            .andExpect {
                status { isOk() }
                jsonPath("$.priceMinorUnits") { value(27999) }
            }
    }

    @Test
    fun `filters by search term`() {
        mockMvc
            .get("/api/products") { param("search", "sony") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(2) }
            }
    }

    @Test
    fun `filters by a single category`() {
        mockMvc
            .get("/api/products") { param("categories", "Laptops") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(3) }
                jsonPath("$[0].category") { value("Laptops") }
            }
    }

    @Test
    fun `filters by any of several categories`() {
        // Audio (4 products) and Laptops (3 products) don't overlap, so
        // selecting both widens the result rather than narrowing it further.
        mockMvc
            .get("/api/products") { param("categories", "Audio", "Laptops") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(7) }
            }
    }

    @Test
    fun `treats a blank search as no search`() {
        mockMvc
            .get("/api/products") { param("search", "") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(32) }
            }
    }

    @Test
    fun `answers a no-match search with 200 and an empty array`() {
        mockMvc
            .get("/api/products") { param("search", "nothingmatchesthis") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(0) }
            }
    }

    @Test
    fun `rejects an over-long search term`() {
        mockMvc
            .get("/api/products") { param("search", "a".repeat(101)) }
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
                jsonPath("$.error") { value("Bad Request") }
                jsonPath("$.message") { value("search must be 100 characters or fewer") }
            }
    }

    @Test
    fun `rejects an over-long category`() {
        mockMvc
            .get("/api/products") { param("categories", "a".repeat(51)) }
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
            }
    }

    @Test
    fun `rejects an over-long category even when it is not the first one`() {
        mockMvc
            .get("/api/products") { param("categories", "Audio", "a".repeat(51)) }
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
            }
    }

    @Test
    fun `returns a single product by id`() {
        mockMvc
            .get("/api/products/2")
            .andExpect {
                status { isOk() }
                jsonPath("$.id") { value("2") }
                jsonPath("$.category") { value("Laptops") }
            }
    }

    @Test
    fun `rejects an over-long product id with a 400 ApiError`() {
        mockMvc
            .get("/api/products/${"a".repeat(51)}")
            .andExpect {
                status { isBadRequest() }
                jsonPath("$.status") { value(400) }
                jsonPath("$.message") { value("id must be 50 characters or fewer") }
            }
    }

    @Test
    fun `answers an unknown id with a 404 ApiError`() {
        mockMvc
            .get("/api/products/9999")
            .andExpect {
                status { isNotFound() }
                jsonPath("$.status") { value(404) }
                jsonPath("$.error") { value("Not Found") }
                jsonPath("$.message") { value("No product with id 9999") }
            }
    }

    @Test
    fun `lists categories in alphabetical order`() {
        mockMvc
            .get("/api/categories")
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(14) }
                jsonPath("$[0]") { value("Accessories") }
            }
    }
}
