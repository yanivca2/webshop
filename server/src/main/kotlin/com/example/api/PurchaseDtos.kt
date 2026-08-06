package com.example.api

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size
import java.time.Instant

/**
 * A requested line. Note what is absent: no name, no price.
 *
 * The client sends ids and quantities only, and the server resolves everything
 * else from the catalog. A tampered basket in localStorage therefore cannot
 * change what a customer is charged.
 */
data class PurchaseItemRequest(
    @field:Size(max = Product.MAX_ID_LENGTH, message = "must be ${Product.MAX_ID_LENGTH} characters or fewer")
    val productId: String,
    @field:Min(value = MIN_QUANTITY, message = "must be at least $MIN_QUANTITY")
    val quantity: Int,
) {
    private companion object {
        const val MIN_QUANTITY = 1L
    }
}

data class PurchaseRequest(
    @field:NotEmpty(message = "must contain at least one item")
    @field:Valid
    val items: List<PurchaseItemRequest>,
)

/** A priced line, resolved server-side. */
data class PurchaseLineResponse(
    val productId: String,
    val name: String,
    val unitPriceMinorUnits: Long,
    val quantity: Int,
    val lineTotalMinorUnits: Long,
)

data class PurchaseResponse(
    val orderId: String,
    val lines: List<PurchaseLineResponse>,
    val itemCount: Int,
    val totalMinorUnits: Long,
    val currency: String,
    val placedAt: Instant,
)

/** Raised for a purchase the catalog cannot honour. Mapped to 400. */
class InvalidPurchaseException(
    message: String,
) : RuntimeException(message)
