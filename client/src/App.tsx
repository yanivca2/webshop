import { useState } from 'react';
import BasketPanel from './components/BasketPanel';
import ProductFilters from './components/ProductFilters';
import ProductGrid from './components/ProductGrid';
import { useCategories } from './hooks/useCategories';
import { useProducts, type ProductFilters as ProductQueryFilters } from './hooks/useProducts';
import './App.css';

export default function App() {
  // Filters only reach the query once the user applies them, so typing or
  // picking a category does not fire a request until they ask for it.
  const [appliedFilters, setAppliedFilters] = useState<ProductQueryFilters>({
    search: '',
    categories: [],
  });

  const products = useProducts(appliedFilters);
  const categories = useCategories();

  const isFiltered = appliedFilters.search.trim() !== '' || appliedFilters.categories.length > 0;

  // The button reports the request an apply started, not every request the
  // query makes: `isFetching` is also true during the first load and during
  // background refetches, which would have it read "Applying..." before anyone
  // applied anything, and - since the form refuses a submit while that flag is
  // up - would swallow an apply made while one of those was still running.
  // New filters mean a new key, and a new key serves the previous results as
  // placeholder data until its own arrive, so placeholder data plus a request
  // still running is the one state only an apply can produce.
  const isApplying = products.isFetching && products.isPlaceholderData;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Webshop</h1>
        <p className="app__subtitle">Tech and electronics, served by Spring Boot.</p>
      </header>

      <div className="app__layout">
        <main className="app__listing">
          <ProductFilters
            categories={categories.data ?? []}
            // A failed category list is its own problem, not an empty catalog:
            // without these the dropdown would open on "No categories match
            // that." and never say the request had failed.
            categoriesPending={categories.isPending}
            categoriesFailed={categories.isError}
            onRetryCategories={() => void categories.refetch()}
            applied={appliedFilters}
            isApplying={isApplying}
            onApply={setAppliedFilters}
          />

          <ProductGrid
            products={products.data}
            // TanStack does not create a request when offline, and there's no
            // explicit "offline" state. We assume offline by the fetch status.
            isOffline={products.fetchStatus === 'paused'}
            isPending={products.isPending}
            isError={products.isError}
            error={products.error}
            isFiltered={isFiltered}
            onRetry={() => void products.refetch()}
          />
        </main>

        <BasketPanel />
      </div>
    </div>
  );
}
