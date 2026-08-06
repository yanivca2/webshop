package com.example.api

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Instant
import java.util.UUID

/**
 * Validates and prices an order against the catalog, then records it to the log
 * - the assignment's stand-in for persistence.
 */
@Service
class PurchaseService(
    private val productRepository: ProductRepository,
    private val clock: Clock,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    // A database owns this invariant properly, with an atomic conditional update
    // (`UPDATE ... WHERE stock >= ?`) or a row lock - a monitor only orders
    // threads inside one JVM. `internal` lets [PurchaseServiceTest] take the same
    // lock and prove a concurrent call blocks.

    /** Guards the stock check in [purchase] so concurrent orders agree on what is available. */
    internal val stockLock = Any()

    /**
     * Prices [request] against the catalog and records it.
     *
     * Quantities are collapsed per product first, so a client that sends the
     * same id twice cannot slip past the per-line stock check by splitting it
     * across lines.
     *
     * @throws InvalidPurchaseException for an unknown product or a quantity the
     *   catalog cannot fulfil.
     */
    fun purchase(request: PurchaseRequest): PurchaseResponse {
        val quantities =
            request.items
                .groupBy(PurchaseItemRequest::productId)
                .mapValues { (_, items) -> items.sumOf(PurchaseItemRequest::quantity) }

        val lines =
            synchronized(stockLock) {
                quantities.map { (productId, quantity) ->
                    val product =
                        productRepository.findById(productId)
                            ?: throw InvalidPurchaseException("No product with id $productId")

                    if (quantity > product.stock) {
                        throw InvalidPurchaseException(
                            "Only ${product.stock} of ${product.name} in stock, requested $quantity",
                        )
                    }

                    PurchaseLineResponse(
                        productId = product.id,
                        name = product.name,
                        unitPriceMinorUnits = product.priceMinorUnits,
                        quantity = quantity,
                        lineTotalMinorUnits = product.priceMinorUnits * quantity,
                    )
                }
            }

        val totalMinorUnits = lines.fold(0L) { sum, line -> sum + line.lineTotalMinorUnits }
        val itemCount = lines.sumOf(PurchaseLineResponse::quantity)
        val response =
            PurchaseResponse(
                orderId = UUID.randomUUID().toString(),
                lines = lines,
                itemCount = itemCount,
                totalMinorUnits = totalMinorUnits,
                currency = CURRENCY,
                placedAt = Instant.now(clock),
            )

        logger.info(
            "Purchase {} placed: {} item(s) across {} line(s), total {} {} [{}]",
            response.orderId,
            itemCount,
            lines.size,
            totalMinorUnits,
            CURRENCY,
            lines.joinToString(", ") { "${it.quantity}x ${it.name} @ ${it.unitPriceMinorUnits}" },
        )

        return response
    }

    private companion object {
        const val CURRENCY = "USD"
    }
}
