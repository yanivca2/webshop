package com.example.api

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ProductServiceTest {
    private val service = ProductService(ProductRepository(jacksonObjectMapper()))

    @Test
    fun `returns the whole catalog when no filter is given`() {
        assertEquals(32, service.search(null, emptyList()).size)
    }

    @Test
    fun `treats a blank filter as absent rather than matching nothing`() {
        assertEquals(32, service.search("   ", listOf("  ")).size)
    }

    @Test
    fun `matches a search term case-insensitively`() {
        val lower = service.search("sony", emptyList()).map(Product::id)
        val upper = service.search("SONY", emptyList()).map(Product::id)

        assertEquals(lower, upper)
        assertTrue(lower.isNotEmpty())
    }

    @Test
    fun `matches on brand as well as name and description`() {
        // "Logitech" is a brand; searching it should find its products even
        // where the brand is not repeated in the name.
        val results = service.search("logitech", emptyList())

        assertTrue(results.isNotEmpty())
        assertTrue(results.all { it.brand.equals("Logitech", ignoreCase = true) })
    }

    @Test
    fun `matches a partial term inside a name`() {
        val results = service.search("book", emptyList())

        assertTrue(results.any { it.name.contains("MacBook") })
    }

    @Test
    fun `filters by a single category`() {
        val results = service.search(null, listOf("Laptops"))

        assertEquals(3, results.size)
        assertTrue(results.all { it.category == "Laptops" })
    }

    @Test
    fun `filters by any of several categories`() {
        // Audio (4 products) and Laptops (3 products) don't overlap, so
        // selecting both widens the result rather than narrowing it further.
        val results = service.search(null, listOf("Audio", "Laptops"))

        assertEquals(7, results.size)
        assertTrue(results.all { it.category == "Audio" || it.category == "Laptops" })
    }

    @Test
    fun `applies search and category together`() {
        val results = service.search("apple", listOf("Laptops"))

        assertTrue(results.isNotEmpty())
        assertTrue(results.all { it.category == "Laptops" && it.brand == "Apple" })
    }

    @Test
    fun `returns an empty list when nothing matches`() {
        assertTrue(service.search("nothingmatchesthis", emptyList()).isEmpty())
    }

    @Test
    fun `throws for an unknown id`() {
        assertFailsWith<ProductNotFoundException> { service.getById("9999") }
    }

    @Test
    fun `lists distinct categories in alphabetical order`() {
        val categories = service.categories()

        assertEquals(categories.distinct(), categories)
        assertEquals(categories.sorted(), categories)
        assertTrue(categories.contains("Audio"))
    }
}
