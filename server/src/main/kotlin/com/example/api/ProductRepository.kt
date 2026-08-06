package com.example.api

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.math.RoundingMode

/**
 * In-memory catalog backed by `products.json` on the classpath.
 *
 * The file is read once at construction rather than per request: the catalog
 * is static, so re-reading it would add IO to every call for no benefit. The
 * parsed list is exposed as an immutable [List] so callers cannot mutate the
 * shared state of this singleton bean.
 *
 * Swapping this for a real datasource means reimplementing this one class.
 */
@Repository
class ProductRepository(
    objectMapper: ObjectMapper,
) {
    private val products: List<Product> =
        ClassPathResource(RESOURCE_PATH).inputStream.use { stream ->
            objectMapper.readValue<List<ProductSeed>>(stream).map(ProductSeed::toProduct)
        }

    private val productsById: Map<String, Product> = products.associateBy(Product::id)

    // In a real catalog this likely wouldn't exist: with thousands of products,
    // returning them all in one response stops making sense.
    // TODO: replace with a paginated query.
    fun findAll(): List<Product> = products

    fun findById(id: String): Product? = productsById[id]

    private companion object {
        const val RESOURCE_PATH = "products.json"
    }
}

/**
 * The on-disk shape of `products.json`: a human-edited decimal price, kept
 * separate from [Product] so the seed data stays readable as e.g. "279.99"
 * while the rest of the app only ever sees the wire-safe integer form.
 */
private data class ProductSeed(
    val id: String,
    val name: String,
    val description: String,
    val price: BigDecimal,
    val category: String,
    val brand: String,
    val stock: Int,
    val imageUrl: String,
) {
    fun toProduct() =
        Product(
            id = id,
            name = name,
            description = description,
            priceMinorUnits = price.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact(),
            category = category,
            brand = brand,
            stock = stock,
            imageUrl = imageUrl,
        )
}
