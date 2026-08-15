import { useState, type FormEvent } from 'react';
import type { ProductFilters as ProductQueryFilters } from '../hooks/useProducts';
import './ProductFilters.css';

const NO_FILTERS: ProductQueryFilters = { search: '' };

interface ProductFiltersProps {
  /** True while the products request that the last apply started is still running. */
  isApplying: boolean;
  onApply: (filters: ProductQueryFilters) => void;
}

export default function ProductFilters({ isApplying, onApply }: ProductFiltersProps) {
  const [search, setSearch] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isApplying) {
      return;
    }
    onApply({ search });
  }

  function handleClear() {
    setSearch('');
    onApply(NO_FILTERS);
  }

  return (
    <form className="filters" aria-label="Filter products" onSubmit={handleSubmit}>
      <div className="filters__field filters__field--search">
        {/* Hiding this element visually while keeping it in the accessibility
            tree. We call it "Search products" rather than "Search" so it won't
            be confused with the Search button beside it. */}
        <label className="filters__label" htmlFor="product-search">
          Search products
        </label>
        <div className="filters__search-box">
          <input
            id="product-search"
            className="filters__input"
            type="search"
            value={search}
            placeholder="What do you want to buy today?"
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="filters__search">
            Search
          </button>
        </div>
      </div>

      <div className="filters__actions">
        {/* We use `aria-disabled` rather than the `disabled` attribute to
            keep the button focusable and in the accessibility tree, so users
            won't lose focus. We handle repeated clicks in `handleSubmit`. */}
        <button type="submit" className="filters__apply" aria-disabled={isApplying}>
          {isApplying ? 'Applying...' : 'Apply'}
        </button>
        <button type="button" className="filters__clear" onClick={handleClear}>
          Clear
        </button>
      </div>
    </form>
  );
}
