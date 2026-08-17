package com.example.api

import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.ErrorResponse
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
    private val logger = LoggerFactory.getLogger(javaClass)

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

    /**
     * The backstop: anything not handled above would otherwise leave through
     * Spring's default error path, which answers in its own shape rather than
     * [ApiError] - so a client parsing the contract finds no message to show.
     *
     * The message is deliberately generic. Whatever an unexpected exception
     * says is written for us, not for a customer, and can name internals; the
     * detail goes to the log instead, where the stack trace is worth having.
     *
     * Spring's own exceptions carry the status and body they are supposed to
     * produce, so they are re-thrown rather than flattened - without this, a
     * 404 for an unmapped URL or a 405 for the wrong method would come back
     * as a 500.
     */
    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<ApiError> {
        if (ex is ErrorResponse) {
            throw ex
        }

        logger.error("Unhandled exception", ex)

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(
                ApiError(
                    status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    error = HttpStatus.INTERNAL_SERVER_ERROR.reasonPhrase,
                    message = "Something went wrong. Please try again.",
                ),
            )
    }

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
