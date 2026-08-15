import { useRef, useState, type FormEvent } from 'react';
import CategoryDropdown from './CategoryDropdown';
import type { ProductFilters as ProductQueryFilters } from '../hooks/useProducts';
import './ProductFilters.css';

const NO_FILTERS: ProductQueryFilters = { search: '', categories: [] };

/**
 * The button being clicked is about to unmount, and focus would fall to <body>
 * along with it, so we move focus first: to the next remove button, or to the
 * fallback once we are removing the last one.
 */
function tryFocusOnNextCategory(
  list: HTMLUListElement | null,
  category: string,
  fallback: HTMLElement | null,
) {
  const buttons = Array.from(list?.querySelectorAll('button') ?? []);
  const index = buttons.findIndex((button) => button.dataset.category === category);
  const next = buttons[index + 1] ?? buttons[index - 1] ?? fallback;
  next?.focus();
}

interface ProductFiltersProps {
  categories: string[];
  /** True while the category list is still loading. */
  categoriesPending: boolean;
  /** True when the category list could not be loaded. */
  categoriesFailed: boolean;
  onRetryCategories: () => void;
  /** The filters the products on screen came back under. */
  applied: ProductQueryFilters;
  /** True while the request that the last apply started is still running. */
  isApplying: boolean;
  onApply: (filters: ProductQueryFilters) => void;
}

export default function ProductFilters({
  categories,
  categoriesPending,
  categoriesFailed,
  onRetryCategories,
  applied,
  isApplying,
  onApply,
}: ProductFiltersProps) {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const appliedListRef = useRef<HTMLUListElement>(null);

  const appliedCategories = [...applied.categories].sort((a, b) => a.localeCompare(b));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isApplying) {
      return;
    }
    onApply({ search, categories: selectedCategories });
  }

  function handleClear() {
    setSearch('');
    setSelectedCategories([]);
    onApply(NO_FILTERS);
  }

  /**
   * We send this straight to the query, because that is what the dropdown's
   * own Apply and Clear selection buttons promise. We move only the
   * categories: if the user has typed a term and not searched for it yet, a
   * category button should not submit it on their behalf.
   */
  function applyCategories(nextCategories: string[]) {
    onApply({ ...applied, categories: nextCategories });
  }

  function removeAppliedCategory(category: string) {
    tryFocusOnNextCategory(appliedListRef.current, category, searchRef.current);

    setSelectedCategories((current) => current.filter((picked) => picked !== category));
    // We take off only the category. The search box may be holding a term the
    // user typed and has not applied, and this is not the moment to submit it
    // for them.
    onApply({
      ...applied,
      categories: applied.categories.filter((picked) => picked !== category),
    });
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
            ref={searchRef}
            className="filters__input"
            type="search"
            value={search}
            placeholder="What do you want to buy today?"
            onChange={(event) => setSearch(event.target.value)}
          />
          {/* We use `aria-disabled` rather than the `disabled` attribute to
              keep the button focusable and in the accessibility tree, so users
              won't lose focus. We handle repeated clicks in `handleSubmit`. */}
          <button type="submit" className="filters__search" aria-disabled={isApplying}>
            {isApplying ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="filters__category-row">
        {/* We use a fieldset because the dropdown's checkboxes are one
            question with several answers, and a legend names that question
            without needing an aria- attribute. */}
        <fieldset className="filters__categories">
          {/* Hidden visually, but kept for accessibility. */}
          <legend className="filters__label">Category</legend>

          <CategoryDropdown
            categories={categories}
            isPending={categoriesPending}
            hasFailed={categoriesFailed}
            onRetry={onRetryCategories}
            selected={selectedCategories}
            applied={applied.categories}
            onSelectionChange={setSelectedCategories}
            onApply={applyCategories}
          />
        </fieldset>

        <button
          type="button"
          className="filters__clear"
          aria-label="Clear all filters"
          title="Clear all filters"
          onClick={handleClear}
        >
          <span className="filters__clear-text">Clear all</span>
          <svg
            className="filters__clear-icon"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path
              d="M2.6 3.2h10.8L9.2 8.2v4.1L6.8 13.6V8.2L2.6 3.2z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M2.6 13.6 13.4 2.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>

      {appliedCategories.length > 0 && (
        <div className="filters__applied">
          <p className="filters__caption" id="applied-caption">
            Filtering by
          </p>
          <ul
            className="filters__applied-list"
            aria-labelledby="applied-caption"
            ref={appliedListRef}
          >
            {appliedCategories.map((category) => (
              <li key={category} className="applied-chip">
                {category}
                <button
                  type="button"
                  className="applied-chip__remove"
                  data-category={category}
                  aria-label={`Remove ${category} filter`}
                  onClick={() => removeAppliedCategory(category)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
