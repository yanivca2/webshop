package com.example.api

import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
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

    /** Request body validation, e.g. `@Valid @RequestBody`. */
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleBodyValidation(ex: MethodArgumentNotValidException): ResponseEntity<ApiError> {
        val message =
            ex.bindingResult.fieldErrors
                .joinToString("; ") { "${it.field} ${it.defaultMessage}" }
                .ifEmpty { "Invalid request" }

        return badRequest(message)
    }

    /**
     * A body that can't even be parsed into the target DTO: malformed JSON, or a
     * required field that's missing or the wrong type. Deliberately a generic
     * message rather than [ex]'s own - that carries raw Jackson internals (target
     * class and parameter names) which don't belong in a client-facing error.
     */
    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadableBody(ex: HttpMessageNotReadableException): ResponseEntity<ApiError> =
        badRequest("Malformed request body")

    /** A purchase referencing a product that does not exist, or an unusable quantity. */
    @ExceptionHandler(InvalidPurchaseException::class)
    fun handleInvalidPurchase(ex: InvalidPurchaseException): ResponseEntity<ApiError> =
        badRequest(ex.message ?: "Invalid purchase")

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
