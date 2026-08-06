package com.example.api

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProductRepositoryTest {
    private val repository = ProductRepository(jacksonObjectMapper())

    // findAll() is only safe to assert on in full because the fixture catalog is
    // tiny (32 products). A real catalog with thousands of products wouldn't
    // expose an unpaginated findAll() at all.
    @Test
    fun `loads every product from the bundled catalog`() {
        assertEquals(32, repository.findAll().size)
    }

    @Test
    fun `parses each field of a product`() {
        val product = assertNotNull(repository.findById("1"))

        assertEquals("Sony WH-1000XM5 Wireless Headphones", product.name)
        assertEquals("Audio", product.category)
        assertEquals("Sony", product.brand)
        assertEquals(14, product.stock)
        assertEquals(27999L, product.priceMinorUnits)
        assertTrue(product.imageUrl.startsWith("https://"))
        assertTrue(product.description.isNotBlank())
    }

    @Test
    fun `returns null for an id that is not in the catalog`() {
        assertNull(repository.findById("9999"))
    }

    @Test
    fun `ids are unique so lookups are unambiguous`() {
        val ids = repository.findAll().map(Product::id)
        assertEquals(ids.size, ids.distinct().size)
    }
}
