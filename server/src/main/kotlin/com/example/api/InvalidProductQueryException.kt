package com.example.api

/**
 * Raised for a `/api/products` query parameter that fails validation Bean
 * Validation doesn't catch on its own - e.g. an over-long value inside a
 * `List<String>` request parameter. Container-element constraints like
 * `List<@Size(...) String>` are a supported Bean Validation feature, but
 * Hibernate Validator does not pick them up here for a Kotlin-compiled
 * method parameter, so each element is checked by hand instead.
 *
 * Mapped to 400 by [ApiExceptionHandler].
 */
class InvalidProductQueryException(
    message: String,
) : RuntimeException(message)
