package com.example.api

import org.springframework.stereotype.Service

/** Catalog queries. Filtering lives here so the controller stays a thin HTTP shell. */
@Service
class ProductService(
    private val repository: ProductRepository,
) {
    /**
     * Products matching both filters. A blank search, or no categories, is
     * treated as absent, so `?search=` or an omitted `categories` behaves like
     * no filter rather than matching nothing.
     *
     * [search] is a case-insensitive substring match across name, description
     * and brand; [categories] matches a product in *any* of the given
     * categories (case-insensitively) - selecting several categories widens
     * the result, it doesn't narrow it further.
     */
    fun search(
        search: String?,
        categories: List<String>,
    ): List<Product> {
        val term = search?.trim()?.lowercase()?.takeIf(String::isNotEmpty)
        val wanted = categories.map(String::trim).filter(String::isNotEmpty).toSet()

        return repository.findAll().filter { product ->
            val matchesTerm =
                term == null ||
                    product.name.lowercase().contains(term) ||
                    product.description.lowercase().contains(term) ||
                    product.brand.lowercase().contains(term)

            val matchesCategory = wanted.isEmpty() || wanted.any { it.equals(product.category, ignoreCase = true) }

            matchesTerm && matchesCategory
        }
    }

    /** @throws ProductNotFoundException when no product carries [id]. */
    fun getById(id: String): Product = repository.findById(id) ?: throw ProductNotFoundException(id)

    /**
     * Distinct categories in alphabetical order, for populating the filter control.
     *
     * Lives here rather than in a dedicated `CategoryService` because this class
     * already serves as the view layer over the catalog. A larger app would
     * likely split it out, but that separation isn't earning its keep yet.
     */
    fun categories(): List<String> =
        repository
            .findAll()
            .map(Product::category)
            .distinct()
            .sorted()
}
