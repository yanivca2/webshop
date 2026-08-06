package com.example.api

import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

/** Error contract mirrored by `client/src/types/api.ts`. */
data class ApiError(
    val status: Int,
    val error: String,
    val message: String,
)

/**
 * Turns expected failures into the [ApiError] shape so the client always has a
 * message worth showing, and a stack trace never reaches the browser.
 */
@RestControllerAdvice
class ApiExceptionHandler {
    /** Query/path parameter validation, e.g. `@Size` on a request param. */
    @ExceptionHandler(ConstraintViolationException::class)
    fun handleParamValidation(ex: ConstraintViolationException): ResponseEntity<ApiError> {
        val message =
            ex.constraintViolations
                .joinToString("; ") { it.message }
                .ifEmpty { "Invalid request" }

        return badRequest(message)
    }

    /** A `/api/products` query parameter that fails a hand-rolled check. */
    @ExceptionHandler(InvalidProductQueryException::class)
    fun handleInvalidProductQuery(ex: InvalidProductQueryException): ResponseEntity<ApiError> =
        badRequest(ex.message ?: "Invalid request")

    @ExceptionHandler(ProductNotFoundException::class)
    fun handleProductNotFound(ex: ProductNotFoundException): ResponseEntity<ApiError> =
        ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(
                ApiError(
                    status = HttpStatus.NOT_FOUND.value(),
                    error = HttpStatus.NOT_FOUND.reasonPhrase,
                    message = ex.message ?: "Not found",
                ),
            )

    private fun badRequest(message: String): ResponseEntity<ApiError> =
        ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ApiError(
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = HttpStatus.BAD_REQUEST.reasonPhrase,
                    message = message,
                ),
            )
}
