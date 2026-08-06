package com.example.api

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PurchaseServiceTest {
    private val fixedInstant: Instant = Instant.parse("2026-08-07T10:15:30Z")
    private val service =
        PurchaseService(
            ProductRepository(jacksonObjectMapper()),
            Clock.fixed(fixedInstant, ZoneOffset.UTC),
        )

    @Test
    fun `prices a line from the catalog`() {
        val response = service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("1", 2))))

        val line = response.lines.single()
        assertEquals("Sony WH-1000XM5 Wireless Headphones", line.name)
        assertEquals(27999L, line.unitPriceMinorUnits)
        assertEquals(2, line.quantity)
        assertEquals(55998L, line.lineTotalMinorUnits)
    }

    @Test
    fun `totals across several lines exactly`() {
        val response =
            service.purchase(
                PurchaseRequest(listOf(PurchaseItemRequest("1", 2), PurchaseItemRequest("2", 1))),
            )

        // 2 x 27999 + 1 x 129900, computed as integer minor units so there is
        // no float drift to tolerate.
        assertEquals(185898L, response.totalMinorUnits)
        assertEquals(3, response.itemCount)
        assertEquals(2, response.lines.size)
    }

    @Test
    fun `stamps the order with the injected clock`() {
        val response = service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("1", 1))))

        assertEquals(fixedInstant, response.placedAt)
    }

    @Test
    fun `gives every order its own id`() {
        val first = service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("1", 1))))
        val second = service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("1", 1))))

        assertTrue(first.orderId != second.orderId)
    }

    @Test
    fun `rejects a product that is not in the catalog`() {
        val failure =
            assertFailsWith<InvalidPurchaseException> {
                service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("9999", 1))))
            }

        assertEquals("No product with id 9999", failure.message)
    }

    @Test
    fun `rejects a quantity beyond available stock`() {
        // Product 1 has 14 in stock.
        val failure =
            assertFailsWith<InvalidPurchaseException> {
                service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("1", 15))))
            }

        assertTrue(failure.message!!.contains("Only 14"))
    }

    @Test
    fun `collapses repeated ids so split lines cannot exceed stock`() {
        // 8 + 8 = 16 against a stock of 14. Checking each line in isolation
        // would let this through.
        assertFailsWith<InvalidPurchaseException> {
            service.purchase(
                PurchaseRequest(listOf(PurchaseItemRequest("1", 8), PurchaseItemRequest("1", 8))),
            )
        }
    }

    @Test
    fun `merges repeated ids into a single priced line`() {
        val response =
            service.purchase(
                PurchaseRequest(listOf(PurchaseItemRequest("1", 2), PurchaseItemRequest("1", 3))),
            )

        assertEquals(1, response.lines.size)
        assertEquals(5, response.lines.single().quantity)
        assertEquals(5, response.itemCount)
    }

    @Test
    fun `allows buying exactly the remaining stock`() {
        val response = service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("1", 14))))

        assertEquals(14, response.lines.single().quantity)
    }

    @Test
    fun `serializes concurrent purchases so one must wait for the other`() {
        val finished = CountDownLatch(1)
        val failure = AtomicReference<Throwable>()

        val background =
            Thread {
                try {
                    service.purchase(PurchaseRequest(listOf(PurchaseItemRequest("1", 1))))
                } catch (e: Throwable) {
                    failure.set(e)
                } finally {
                    finished.countDown()
                }
            }

        // Holding the service's own lock blocks the background thread before it
        // can reach purchase()'s synchronized section - the same lock a second
        // concurrent request would contend on. Waiting for the JVM to actually
        // report the thread as BLOCKED (rather than inferring that from a fixed
        // sleep) means this can't pass just because the background thread was
        // slow to get scheduled: a removed lock leaves it RUNNABLE, and likely
        // already finished, well before the deadline below.
        synchronized(service.stockLock) {
            background.start()

            val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(1)
            while (background.state != Thread.State.BLOCKED && System.nanoTime() < deadline) {
                Thread.onSpinWait()
            }

            assertEquals(Thread.State.BLOCKED, background.state)
            assertFalse(finished.await(50, TimeUnit.MILLISECONDS))
        }

        assertTrue(finished.await(1, TimeUnit.SECONDS))
        assertNull(failure.get())
    }
}
