import ProductGrid from './components/ProductGrid';
import { useProducts } from './hooks/useProducts';
import './App.css';

export default function App() {
  const products = useProducts();

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Webshop</h1>
        <p className="app__subtitle">Tech and electronics, served by Spring Boot.</p>
      </header>

      <main className="app__main">
        <ProductGrid
          products={products.data}
          // TanStack does not create a request when offline, and there's no
          // explicit "offline" state. We assume offline by the fetch status.
          isOffline={products.fetchStatus === 'paused'}
          isPending={products.isPending}
          isError={products.isError}
          error={products.error}
          onRetry={() => void products.refetch()}
        />
      </main>
    </div>
  );
}
