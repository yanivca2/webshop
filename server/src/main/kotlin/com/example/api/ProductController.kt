package com.example.api

import jakarta.validation.constraints.Size
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
@Validated
class ProductController(
    private val productService: ProductService,
) {
    /**
     * The catalog, optionally filtered. An empty result is a 200 with an empty
     * array - "nothing matched your search" is a valid answer, not an error.
     */
    @GetMapping("/products")
    fun products(
        @RequestParam(required = false)
        @Size(max = MAX_SEARCH_LENGTH, message = "search must be $MAX_SEARCH_LENGTH characters or fewer")
        search: String?,
        @RequestParam(required = false)
        categories: List<String>?,
    ): List<Product> {
        // Bean Validation's container-element constraints (List<@Size String>)
        // aren't enforced here for a Kotlin-compiled method parameter, so each
        // element is validated by hand instead - see InvalidProductQueryException.
        categories?.forEach {
            if (it.length > MAX_CATEGORY_LENGTH) {
                throw InvalidProductQueryException("each category must be $MAX_CATEGORY_LENGTH characters or fewer")
            }
        }
        return productService.search(search, categories ?: emptyList())
    }

    /** @throws ProductNotFoundException mapped to 404 by [ApiExceptionHandler]. */
    @GetMapping("/products/{id}")
    fun product(
        @PathVariable
        @Size(max = Product.MAX_ID_LENGTH, message = "id must be ${Product.MAX_ID_LENGTH} characters or fewer")
        id: String,
    ): Product = productService.getById(id)

    @GetMapping("/categories")
    fun categories(): List<String> = productService.categories()

    private companion object {
        const val MAX_SEARCH_LENGTH = 100
        const val MAX_CATEGORY_LENGTH = 50
    }
}
