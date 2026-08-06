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

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(ConstraintViolationException::class)
    fun handleValidation(ex: ConstraintViolationException): ResponseEntity<ApiError> {
        val message =
            ex.constraintViolations
                .joinToString("; ") { it.message }
                .ifEmpty { "Invalid request" }

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ApiError(
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = HttpStatus.BAD_REQUEST.reasonPhrase,
                    message = message,
                ),
            )
    }
}
