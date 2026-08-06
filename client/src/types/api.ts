/**
 * Wire contract shared with the Spring Boot backend.
 * Mirrors the Kotlin DTOs in `server/src/main/kotlin/com/example/api/`.
 * Keep both sides in sync when either changes.
 */

/** Mirrors `com.example.api.ApiError`. */
export interface ApiError {
  status: number;
  error: string;
  message: string;
}
