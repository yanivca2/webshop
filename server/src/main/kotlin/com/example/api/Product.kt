package com.example.api

/** A catalog item. Response contract mirrored by `client/src/types/api.ts`. */
data class Product(
    val id: String,
    val name: String,
    val description: String,
    // Keeps `priceMinorUnits` to the currency's smallest unit (e.g. cents) for
    // simplified math and preventing floating point calculation issues.
    val priceMinorUnits: Long,
    val category: String,
    val brand: String,
    val stock: Int,
    val imageUrl: String,
) {
    companion object {
        /** Shared with any other DTO carrying a product id, e.g. [PurchaseItemRequest]. */
        const val MAX_ID_LENGTH = 50
    }
}
