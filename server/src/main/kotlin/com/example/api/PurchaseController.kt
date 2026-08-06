package com.example.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class PurchaseController(
    private val purchaseService: PurchaseService,
) {
    /** 201: the request created an order, and the body describes what was bought. */
    @PostMapping("/purchases")
    @ResponseStatus(HttpStatus.CREATED)
    fun purchase(
        @Valid @RequestBody request: PurchaseRequest,
    ): PurchaseResponse = purchaseService.purchase(request)
}
