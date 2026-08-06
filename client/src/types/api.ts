/**
 * Wire contract shared with the Spring Boot backend.
 * Mirrors `com.example.api.GreetingResponse` / `ApiError` in `server/`.
 * Keep both sides in sync when either changes.
 */

export interface GreetingResponse {
  message: string;
  /** ISO-8601 instant, e.g. "2026-08-06T10:15:30Z" */
  generatedAt: string;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
}
