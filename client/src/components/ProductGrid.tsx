import type { ReactElement, ReactNode } from 'react';
import ProductItem from './ProductItem';
import StatusMessage from './StatusMessage';
import ViewModeToggle from './ViewModeToggle';
import { useViewMode } from '../hooks/useViewMode';
import type { Product } from '../types/api';
import './ProductGrid.css';

interface ProductGridProps {
  products: Product[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isOffline: boolean;
  // True when filters are active, which changes what "no results" means.
  isFiltered: boolean;
  onRetry: () => void;
  onOpenDetail: (productId: string) => void;
}

export default function ProductGrid({
  products,
  isPending,
  isError,
  error,
  isOffline,
  isFiltered,
  onRetry,
  onOpenDetail,
}: ProductGridProps): ReactElement {
  const [viewMode, setViewMode] = useViewMode();
  const resultCount = products?.length;

  const hasProducts = products !== undefined && products.length > 0;

  let content: ReactNode;
  if (isOffline && !hasProducts) {
    // Offline also reads as pending, so it has to be checked first.
    content = (
      <StatusMessage
        title="You are offline"
        detail="The catalog will load by itself once the connection is back."
      />
    );
  } else if (isPending) {
    content = (
      <ul className="grid" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="grid__skeleton" />
        ))}
      </ul>
    );
  } else if (isError) {
    content = (
      <StatusMessage
        tone="error"
        title="Could not load products"
        detail={error?.message ?? 'Something went wrong.'}
        onRetry={onRetry}
      />
    );
  } else if (!products || products.length === 0) {
    content = isFiltered ? (
      <StatusMessage
        title="No products match your filters"
        detail="Try a different search term or category."
      />
    ) : (
      <StatusMessage title="No products available" detail="The catalog is currently empty." />
    );
  } else {
    content = (
      <ul className={`grid grid--${viewMode}`}>
        {products.map((product) => (
          <ProductItem
            key={product.id}
            product={product}
            viewMode={viewMode}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="grid-panel">
      <div className="grid-panel__toolbar">
        <div className="grid-panel__heading">
          <h2 className="grid-panel__title">Products</h2>
          {/* Politely announced so screen reader users hear the count change,
              without focus moving away from wherever they are. It sits beside
              the heading rather than inside it so that the heading text stays
              put while the number underneath it moves. */}
          <p className="grid-panel__count" role="status" aria-live="polite">
            {resultCount === undefined
              ? ''
              : `${resultCount} ${resultCount === 1 ? 'product' : 'products'}`}
          </p>
        </div>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Only when there is something on screen to keep: with an empty grid
          the message above says this already, and saying it twice is worse
          than saying it once. Products stay put underneath - they are still
          the last thing the server said - and this explains why they have not
          changed. */}
      {isOffline && hasProducts ? (
        <p className="grid-panel__offline" role="status">
          You are offline. This will catch up on its own once the connection is back.
        </p>
      ) : null}

      {content}
    </div>
  );
}
