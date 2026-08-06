/**
 * Wire contract shared with the Spring Boot backend.
 * Mirrors the Kotlin DTOs in `server/src/main/kotlin/com/example/api/`.
 * Keep both sides in sync when either changes.
 *
 * Hand-maintained because the contract here is small. In a real application
 * this would be generated - e.g. from an OpenAPI spec (springdoc-openapi on
 * the server, openapi-typescript on the client) - rather than kept in sync by
 * hand as the contract grows.
 */

/** Mirrors `com.example.api.Product`. */
export interface Product {
  id: string;
  name: string;
  description: string;
  /** Integer count of the currency's smallest unit (e.g. cents), not a decimal amount. */
  priceMinorUnits: number;
  category: string;
  brand: string;
  stock: number;
  imageUrl: string;
}

/**
 * Mirrors `com.example.api.PurchaseItemRequest`.
 * Deliberately carries only ids and quantities - the server resolves names and
 * prices itself so a tampered basket cannot influence what gets charged.
 */
export interface PurchaseItemRequest {
  productId: string;
  quantity: number;
}

/** Mirrors `com.example.api.PurchaseRequest`. */
export interface PurchaseRequest {
  items: PurchaseItemRequest[];
}

/** Mirrors `com.example.api.PurchaseLineResponse`. */
export interface PurchaseLine {
  productId: string;
  name: string;
  unitPriceMinorUnits: number;
  quantity: number;
  lineTotalMinorUnits: number;
}

/** Mirrors `com.example.api.PurchaseResponse`. */
export interface PurchaseResponse {
  orderId: string;
  lines: PurchaseLine[];
  itemCount: number;
  totalMinorUnits: number;
  currency: string;
  /** ISO-8601 instant, e.g. "2026-08-07T10:15:30Z" */
  placedAt: string;
}

/** Mirrors `com.example.api.ApiError`. */
export interface ApiError {
  status: number;
  error: string;
  message: string;
}
