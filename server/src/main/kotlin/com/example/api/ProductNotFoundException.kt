package com.example.api

/** Raised when a catalog lookup misses. Mapped to 404 by [ApiExceptionHandler]. */
class ProductNotFoundException(
    val productId: String,
) : RuntimeException("No product with id $productId")
